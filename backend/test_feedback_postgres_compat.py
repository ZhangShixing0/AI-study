import os
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


class PublicSchemaFeedbackConnection:
    def __init__(self):
        self.calls = []
        self.inserted_chapter_completion = None

    def execute(self, sql, params=None):
        normalized = " ".join(str(sql).split())
        self.calls.append((normalized, params))

        if normalized.startswith("CREATE ") or normalized.startswith("ALTER "):
            return FakeCursor()
        if normalized.startswith("CREATE INDEX"):
            return FakeCursor()
        if "PRAGMA table_info(loss_reason_stats)" in normalized:
            return FakeCursor(rows=[{"name": "trend_delta"}])
        if "PRAGMA table_info(chapter_summary_templates)" in normalized:
            return FakeCursor(
                rows=[
                    {"name": "summary_template_id"},
                    {"name": "chapter_id"},
                    {"name": "math_type"},
                    {"name": "plan_stage"},
                    {"name": "summary_title"},
                    {"name": "exam_focus"},
                    {"name": "key_points"},
                    {"name": "common_mistakes"},
                    {"name": "review_suggestions"},
                    {"name": "is_active"},
                    {"name": "updated_at"},
                ]
            )
        if "PRAGMA table_info(student_chapter_completions)" in normalized:
            return FakeCursor(
                rows=[
                    {"name": "completion_id"},
                    {"name": "user_id"},
                    {"name": "raw_chapter_id"},
                    {"name": "chapter_name"},
                    {"name": "math_type"},
                    {"name": "plan_stage"},
                    {"name": "started_at"},
                    {"name": "completed_at"},
                    {"name": "spent_days"},
                    {"name": "completed_type_count"},
                    {"name": "total_type_count"},
                    {"name": "submitted_question_count"},
                    {"name": "wrong_question_count"},
                    {"name": "accuracy_rate"},
                    {"name": "main_loss_reasons"},
                    {"name": "review_type_ids"},
                    {"name": "review_type_names"},
                    {"name": "summary_template_id"},
                    {"name": "created_at"},
                    {"name": "updated_at"},
                ]
            )
        if "to_regclass" in normalized:
            return FakeCursor(row={"table_ref": "public.question_type_orders"})
        if "SELECT 1 FROM question_type_orders" in normalized:
            return FakeCursor(row={"exists": 1})
        if "SELECT plan_variant_id FROM student_profiles WHERE user_id" in normalized:
            return FakeCursor(row={"plan_variant_id": "math2_mixed"})
        if "SELECT * FROM student_profiles WHERE user_id" in normalized:
            return FakeCursor(
                row={
                    "user_id": "60001",
                    "math_type": "数学二",
                    "plan_variant_id": "math2_mixed",
                    "current_stage": "",
                }
            )
        if "JOIN question_types q" in normalized and "AND o.type_id = ?" in normalized:
            return FakeCursor(
                row={
                    "type_id": "M2-QT-0001",
                    "chapter_id": "M2-CH-0001",
                    "type_name": "函数极限概念辨析",
                    "plan_stage": "",
                    "variant_sort_code": "0001",
                    "variant_suggested_days": "1",
                    "variant_direct_assignable": "1",
                }
            )
        if "JOIN question_types q" in normalized and "AND q.chapter_id = ?" in normalized:
            return FakeCursor(
                rows=[
                    {
                        "type_id": "M2-QT-0001",
                        "chapter_id": "M2-CH-0001",
                        "type_name": "函数极限概念辨析",
                        "variant_sort_code": "0001",
                        "variant_suggested_days": "1",
                        "variant_direct_assignable": "1",
                    }
                ]
            )
        if "SELECT DISTINCT type_id FROM question_feedbacks" in normalized:
            return FakeCursor(rows=[{"type_id": "M2-QT-0001"}])
        if (
            "FROM question_feedbacks f" in normalized
            and "qt.chapter_name" in normalized
            and "JOIN chapters" not in normalized
        ):
            raise AssertionError("question_types.chapter_name is not available in public PostgreSQL schema")
        if "qt.sort_code" in normalized:
            raise AssertionError("question_types.sort_code is not available in public PostgreSQL schema")
        if "FROM question_feedbacks f" in normalized and "JOIN chapters" in normalized:
            return FakeCursor(
                rows=[
                    {
                        "plan_date": "2026-06-28",
                        "submitted_at": "2026-06-28 18:00:00",
                        "type_id": "M2-QT-0001",
                        "question_id": "Q1",
                        "result": "correct",
                        "is_wrong_record": "0",
                        "wrong_reason_code": "",
                        "type_name": "函数极限概念辨析",
                        "chapter_name": "极限",
                    }
                ]
            )
        if "FROM chapter_summary_templates" in normalized:
            return FakeCursor(row=None)
        if "SELECT created_at FROM student_chapter_completions" in normalized:
            return FakeCursor(row=None)
        if normalized.startswith("DELETE FROM student_chapter_completions"):
            return FakeCursor()
        if normalized.startswith("INSERT INTO student_chapter_completions"):
            self.inserted_chapter_completion = params
            return FakeCursor()

        return FakeCursor()


class FeedbackPostgresCompatibilityTests(unittest.TestCase):
    def test_chapter_completion_reads_chapter_name_from_chapters_table(self):
        conn = PublicSchemaFeedbackConnection()

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}, clear=False):
            services.maybe_upsert_chapter_completion_after_feedback(
                conn,
                "60001",
                "2026-06-28",
                "M2-QT-0001",
                "2026-06-28 18:00:00",
            )

        joined_queries = "\n".join(sql for sql, _ in conn.calls)
        self.assertIn("JOIN chapters", joined_queries)
        self.assertIsNotNone(conn.inserted_chapter_completion)

    def test_mastery_stats_uses_variant_order_not_question_types_sort_code(self):
        conn = PublicSchemaFeedbackConnection()

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}, clear=False):
            services.recalculate_type_mastery_stats(conn, "60001", "2026-06-28", "2026-06-28 18:00:00")

        joined_queries = "\n".join(sql for sql, _ in conn.calls)
        self.assertIn("question_type_orders", joined_queries)
        self.assertNotIn("qt.sort_code", joined_queries)


if __name__ == "__main__":
    unittest.main()
