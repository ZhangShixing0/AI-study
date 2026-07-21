import os
import sqlite3
import unittest
from unittest.mock import patch

from backend import services


class FakeCursor:
    def __init__(self, rows=None, row=None):
        self._rows = rows or []
        self._row = row

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._row


class PublicSchemaCurveConnection:
    def __init__(self):
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return None

    def execute(self, sql, params=None):
        normalized = " ".join(str(sql).split())
        self.calls.append((normalized, params))

        if "SELECT * FROM users WHERE user_id" in normalized:
            return FakeCursor(row={"user_id": "60001", "nickname": "Student"})
        if "SELECT * FROM student_profiles WHERE user_id" in normalized:
            return FakeCursor(
                row={
                    "user_id": "60001",
                    "math_type": "数学二",
                    "target_score": "120",
                    "class_id": "C201",
                }
            )
        if "SELECT * FROM student_stats" in normalized:
            return FakeCursor(row=None)
        if "FROM student_daily_activity" in normalized:
            return FakeCursor(rows=[])
        if "FROM question_feedbacks" in normalized:
            return FakeCursor(row={"correct_questions": "0", "wrong_questions": "0"})
        if "FROM type_mastery_stats" in normalized:
            return FakeCursor(rows=[])
        if "FROM loss_reason_stats" in normalized:
            return FakeCursor(rows=[])
        if "to_regclass" in normalized and params == ("public.chapters",):
            return FakeCursor(row={"table_ref": "public.chapters"})
        if (
            "FROM question_types" in normalized
            and "chapter_name" in normalized
            and "JOIN chapters" not in normalized
        ):
            raise AssertionError("question_types.chapter_name is not available in public PostgreSQL schema")
        if "FROM question_types" in normalized and "JOIN chapters" in normalized:
            if "type_id" in normalized:
                return FakeCursor(rows=[{"type_id": "M2-QT-0001", "chapter_id": "M2-C01", "chapter_name": "Limits"}])
            return FakeCursor(rows=[{"chapter_id": "M2-C01", "chapter_name": "Limits"}])
        return FakeCursor(rows=[])


class CurvePostgresCompatibilityTests(unittest.TestCase):
    def test_curve_reads_chapter_name_from_chapters_table(self):
        conn = PublicSchemaCurveConnection()

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}, clear=False):
            with patch("backend.services.get_connection", return_value=conn):
                result = services.get_curve("60001", "2026-06-28")

        joined_queries = "\n".join(sql for sql, _ in conn.calls)
        self.assertIn("JOIN chapters", joined_queries)
        self.assertEqual(result["curve"]["mastery"][0]["name"], "Limits")


class CurveMasteryScopeTests(unittest.TestCase):
    def make_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE question_types (
              type_id TEXT PRIMARY KEY,
              type_name TEXT NOT NULL,
              chapter_id TEXT NOT NULL DEFAULT '',
              chapter_name TEXT NOT NULL DEFAULT '',
              math_type TEXT NOT NULL DEFAULT '',
              sort_code TEXT NOT NULL,
              suggested_days TEXT NOT NULL,
              direct_assignable TEXT NOT NULL
            );
            CREATE TABLE questions (
              question_id TEXT PRIMARY KEY,
              type_id TEXT NOT NULL,
              book_id TEXT NOT NULL,
              applicable_levels TEXT NOT NULL,
              plan_stage TEXT NOT NULL,
              original_position_text TEXT NOT NULL,
              question_order TEXT NOT NULL,
              display_permission TEXT NOT NULL,
              is_active TEXT NOT NULL,
              question_note TEXT
            );
            CREATE TABLE question_feedbacks (
              feedback_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              plan_date TEXT NOT NULL,
              type_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              result TEXT NOT NULL,
              is_wrong_record TEXT NOT NULL,
              unattempted_action TEXT NOT NULL DEFAULT '',
              submitted_at TEXT NOT NULL
            );
            """
        )
        conn.executemany(
            """
            INSERT INTO question_types (
              type_id, type_name, chapter_id, chapter_name, math_type,
              sort_code, suggested_days, direct_assignable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("SCOPE-OLD", "Old book scope type", "SCOPE-CH", "Scope Chapter", "\u6570\u5b66\u4e8c", "001", "0.3", "1"),
                ("SCOPE-NEW", "New book scope type", "SCOPE-CH", "Scope Chapter", "\u6570\u5b66\u4e8c", "002", "0.3", "1"),
            ],
        )
        conn.executemany(
            """
            INSERT INTO questions (
              question_id, type_id, book_id, applicable_levels, plan_stage,
              original_position_text, question_order, display_permission, is_active, question_note
            ) VALUES (?, ?, ?, 'A,B,C,D', ?, ?, ?, 'number', '1', '')
            """,
            [
                ("SCOPE-OLD-Q1", "SCOPE-OLD", "m2_880", "\u5f3a\u5316", "old q1", "1"),
                ("SCOPE-OLD-Q2", "SCOPE-OLD", "m2_880", "\u5f3a\u5316", "old q2", "2"),
                ("SCOPE-OLD-Q3", "SCOPE-OLD", "m2_880", "\u5f3a\u5316", "old q3", "3"),
                ("SCOPE-NEW-Q1", "SCOPE-NEW", "m2_880", "\u5f3a\u5316", "new q1", "1"),
                ("SCOPE-NEW-Q2", "SCOPE-NEW", "m2_880", "\u5f3a\u5316", "new q2", "2"),
            ],
        )
        conn.execute(
            """
            INSERT INTO question_feedbacks (
              feedback_id, user_id, plan_date, type_id, question_id,
              result, is_wrong_record, unattempted_action, submitted_at
            ) VALUES (?, ?, ?, ?, ?, 'correct', '0', '', ?)
            """,
            ("SCOPE-FB-1", "scope-stu", "2026-06-30", "SCOPE-NEW", "SCOPE-NEW-Q1", "2026-06-30 20:00:00"),
        )
        return conn

    def test_mastery_denominator_starts_from_stable_plan_scope_type(self) -> None:
        conn = self.make_conn()
        try:
            profile = {
                "math_type": "\u6570\u5b66\u4e8c",
                "level": "A",
                "primary_book_1": "m2_880",
                "primary_book_2": "",
                "current_stage": "\u5f3a\u5316",
                "plan_variant_id": "",
            }
            progress = {
                "plan_stage": "\u5f3a\u5316",
                "mastery_scope_start_type_id": "SCOPE-NEW",
            }

            mastery = services.chapter_mastery_for_curve(conn, "scope-stu", profile, progress, "2026-06-30")

            row = next(item for item in mastery if item["chapterId"] == "SCOPE-CH")
            self.assertEqual(row["submittedQuestionCount"], 1)
            self.assertEqual(row["correctQuestionCount"], 1)
            self.assertEqual(row["totalQuestionCount"], 2)
            self.assertEqual(row["rate"], 50)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
