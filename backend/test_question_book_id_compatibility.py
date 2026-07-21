from __future__ import annotations

import json
import sqlite3
import unittest

from backend import services


class QuestionBookIdCompatibilityTest(unittest.TestCase):
    def make_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE question_types (
              type_id TEXT PRIMARY KEY,
              type_name TEXT NOT NULL,
              chapter_id TEXT NOT NULL DEFAULT '',
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
              question_note TEXT,
              source_section_label TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE daily_plans (
              plan_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              plan_date TEXT NOT NULL,
              plan_status TEXT NOT NULL,
              slogan TEXT NOT NULL,
              exam_date TEXT NOT NULL,
              days_to_exam TEXT NOT NULL,
              type_index TEXT NOT NULL,
              type_id TEXT NOT NULL,
              type_name TEXT NOT NULL,
              question_id TEXT NOT NULL,
              source TEXT NOT NULL,
              original_position_text TEXT NOT NULL,
              question_order TEXT NOT NULL,
              feedback_open_status TEXT NOT NULL,
              chapter_id TEXT NOT NULL DEFAULT '',
              student_type_sort_in_chapter TEXT NOT NULL DEFAULT '0',
              display_type_label TEXT NOT NULL DEFAULT '',
              is_chapter_boundary_after TEXT NOT NULL DEFAULT '0',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE student_progress (
              user_id TEXT PRIMARY KEY,
              last_generated_plan_date TEXT NOT NULL DEFAULT '',
              current_type_status TEXT NOT NULL DEFAULT 'active',
              carryover_type_id TEXT NOT NULL DEFAULT '',
              carryover_question_ids TEXT NOT NULL DEFAULT '[]',
              updated_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE student_profiles (
              user_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL DEFAULT '',
              current_stage TEXT NOT NULL DEFAULT '',
              plan_variant_id TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE question_feedbacks (
              feedback_id TEXT PRIMARY KEY,
              plan_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              plan_date TEXT NOT NULL,
              type_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              result TEXT NOT NULL,
              is_wrong_record TEXT NOT NULL DEFAULT '0',
              wrong_reason_code TEXT NOT NULL DEFAULT '',
              wrong_reason_name TEXT NOT NULL DEFAULT '',
              submitted_at TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT ''
            );
            """
        )
        conn.execute(
            """
            INSERT INTO question_types (
              type_id, type_name, sort_code, suggested_days, direct_assignable
            ) VALUES (?, ?, ?, ?, ?)
            """,
            ("M2-QT-BOOK", "book_id兼容测试题型", "001", "0.3", "1"),
        )
        conn.executemany(
            """
            INSERT INTO questions (
              question_id, type_id, book_id, applicable_levels, plan_stage,
              original_position_text, question_order, display_permission,
              is_active, question_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("M2-880-Q001", "M2-QT-BOOK", "m2_880", "A,B,C,D", "强化", "《880》第1题", "1", "仅显示题号", "1", ""),
                ("M2-1000-Q001", "M2-QT-BOOK", "m2_1000", "A,B,C,D", "强化", "《1000》第1题", "2", "仅显示题号", "1", ""),
                ("M1-880-Q001", "M2-QT-BOOK", "m1_880", "A,B,C,D", "强化", "数一《880》第1题", "3", "仅显示题号", "1", ""),
            ],
        )
        conn.execute("INSERT INTO student_progress (user_id) VALUES (?)", ("stu-book",))
        return conn

    def profile(self) -> dict[str, str]:
        return {
            "plan_enabled": "1",
            "math_type": "数学二",
            "level": "A",
            "current_stage": "强化",
            "target_exam_date": "2026-12-19",
            "primary_book_1": "880",
            "primary_book_2": "1000",
            "plan_variant_id": "",
        }

    def test_profile_book_ids_are_canonicalized_for_math_type(self) -> None:
        self.assertEqual(services.canonical_profile_book_id("880", "数学二"), "m2_880")
        self.assertEqual(services.canonical_profile_book_id("880题", "数学二"), "m2_880")
        self.assertEqual(services.canonical_profile_book_id("m2_880", "数学二"), "m2_880")
        self.assertEqual(services.canonical_profile_book_id("m1_880", "数学二"), "m1_880")
        self.assertEqual(services.canonical_profile_book_id("严选题", "数学二"), "m2_yanxuan")
        self.assertEqual(services.canonical_profile_book_id("严选题基础篇", "数学二"), "m2_yanxuan_basic")
        self.assertEqual(services.profile_book_display_code("m2_880"), "880")
        self.assertEqual(services.profile_book_display_code("m2_yanxuan"), "严选题")

    def test_get_type_questions_matches_formal_book_id_with_legacy_student_books(self) -> None:
        conn = self.make_conn()
        try:
            questions = services.get_type_questions(conn, "M2-QT-BOOK", self.profile(), "强化")

            self.assertEqual([row["question_id"] for row in questions], ["M2-880-Q001", "M2-1000-Q001"])
        finally:
            conn.close()

    def test_get_type_questions_respects_scoped_880_selection(self) -> None:
        conn = self.make_conn()
        try:
            conn.execute(
                """
                INSERT INTO question_types (
                  type_id, type_name, sort_code, suggested_days, direct_assignable
                ) VALUES (?, ?, ?, ?, ?)
                """,
                ("M2-QT-SCOPE", "880 scope test", "002", "0.3", "1"),
            )
            conn.executemany(
                """
                INSERT INTO questions (
                  question_id, type_id, book_id, applicable_levels, plan_stage,
                  original_position_text, question_order, display_permission,
                  is_active, question_note, source_section_label
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "M2-880-SCOPE-BASIC",
                        "M2-QT-SCOPE",
                        "m2_880",
                        "A,B,C,D",
                        "强化",
                        "《880》第1章基础一第1题",
                        "1",
                        "仅显示题号",
                        "1",
                        "",
                        "基础",
                    ),
                    (
                        "M2-880-SCOPE-ADVANCED",
                        "M2-QT-SCOPE",
                        "m2_880",
                        "A,B,C,D",
                        "强化",
                        "《880》第1章强化一第2题",
                        "2",
                        "仅显示题号",
                        "1",
                        "",
                        "强化",
                    ),
                    (
                        "M2-880-SCOPE-COMPREHENSIVE",
                        "M2-QT-SCOPE",
                        "m2_880",
                        "A,B,C,D",
                        "强化",
                        "《880》第1章综合第3题",
                        "3",
                        "仅显示题号",
                        "1",
                        "",
                        "综合",
                    ),
                ],
            )

            profile = self.profile()
            profile.update(
                {
                    "primary_book_1": "m2_880",
                    "primary_book_2": "",
                    "primary_book_1_scope": "advanced",
                    "primary_book_2_scope": "all",
                }
            )
            advanced_questions = services.get_type_questions(conn, "M2-QT-SCOPE", profile, "强化")
            self.assertEqual(
                [row["question_id"] for row in advanced_questions],
                ["M2-880-SCOPE-ADVANCED", "M2-880-SCOPE-COMPREHENSIVE"],
            )

            profile["primary_book_1_scope"] = "basic"
            basic_questions = services.get_type_questions(conn, "M2-QT-SCOPE", profile, "强化")
            self.assertEqual([row["question_id"] for row in basic_questions], ["M2-880-SCOPE-BASIC"])

            profile["primary_book_1_scope"] = "both"
            both_questions = services.get_type_questions(conn, "M2-QT-SCOPE", profile, "强化")
            self.assertEqual(
                [row["question_id"] for row in both_questions],
                ["M2-880-SCOPE-BASIC", "M2-880-SCOPE-ADVANCED", "M2-880-SCOPE-COMPREHENSIVE"],
            )
        finally:
            conn.close()

    def test_generate_daily_plan_writes_display_source_from_book_id_only_questions(self) -> None:
        conn = self.make_conn()
        try:
            rows = services.generate_daily_plan(
                conn,
                {"user_id": "stu-book"},
                self.profile(),
                {
                    "progress_status": "active",
                    "plan_stage": "强化",
                    "current_type_id": "M2-QT-BOOK",
                    "current_type_status": "active",
                },
                "2026-06-28",
            )

            self.assertEqual([row["source"] for row in rows], ["880", "1000"])
        finally:
            conn.close()

    def test_generate_daily_plan_renumbers_actual_assignable_types_by_chapter(self) -> None:
        conn = self.make_conn()
        try:
            conn.executemany(
                """
                INSERT INTO question_types (
                  type_id, type_name, chapter_id, sort_code, suggested_days, direct_assignable
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-A-01", "Sequence chapter A type 1", "SEQ-A", "S001", "0.1", "1"),
                    ("SEQ-A-02", "Sequence chapter A type 2", "SEQ-A", "S002", "0.1", "1"),
                    ("SEQ-A-03", "Sequence chapter A missing selected book", "SEQ-A", "S003", "0.1", "1"),
                    ("SEQ-B-01", "Sequence chapter B type 1", "SEQ-B", "S004", "0.1", "1"),
                ],
            )
            conn.executemany(
                """
                INSERT INTO questions (
                  question_id, type_id, book_id, applicable_levels, plan_stage,
                  original_position_text, question_order, display_permission,
                  is_active, question_note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-A-01-Q01", "SEQ-A-01", "m2_880", "A,B,C,D", "寮哄寲", "A1 question", "1", "number", "1", ""),
                    ("SEQ-A-02-Q01", "SEQ-A-02", "m2_880", "A,B,C,D", "寮哄寲", "A2 question", "1", "number", "1", ""),
                    ("SEQ-A-03-Q01", "SEQ-A-03", "m2_yanxuan", "A,B,C,D", "寮哄寲", "A3 hidden question", "1", "number", "1", ""),
                    ("SEQ-B-01-Q01", "SEQ-B-01", "m2_880", "A,B,C,D", "寮哄寲", "B1 question", "1", "number", "1", ""),
                ],
            )

            rows = services.generate_daily_plan(
                conn,
                {"user_id": "stu-sequence"},
                self.profile(),
                {
                    "progress_status": "active",
                    "plan_stage": "寮哄寲",
                    "current_type_id": "SEQ-A-01",
                    "current_type_status": "active",
                },
                "2026-06-29",
            )

            type_rows = []
            seen = set()
            for row in rows:
                if row["type_id"] in seen:
                    continue
                seen.add(row["type_id"])
                type_rows.append(row)

            self.assertEqual([row["type_id"] for row in type_rows], ["SEQ-A-01", "SEQ-A-02", "SEQ-B-01"])
            self.assertEqual([row["student_type_sort_in_chapter"] for row in type_rows], ["1", "2", "1"])
            self.assertEqual([row["display_type_label"] for row in type_rows], ["题型1", "题型2", "题型1"])
            self.assertEqual([row["is_chapter_boundary_after"] for row in type_rows], ["0", "1", "1"])
        finally:
            conn.close()

    def test_chapter_summary_uses_actual_planned_boundary_instead_of_public_missing_type(self) -> None:
        conn = self.make_conn()
        user_id = "stu-summary-boundary"
        plan_date = "2026-06-29"
        chapter_id = "SEQ-SUM-A"
        try:
            services.ensure_growth_snapshot_tables(conn)
            conn.execute(
                """
                INSERT INTO student_profiles (user_id, math_type, current_stage, plan_variant_id)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, "数学二", "强化", ""),
            )
            conn.executemany(
                """
                INSERT INTO question_types (
                  type_id, type_name, chapter_id, sort_code, suggested_days, direct_assignable
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-SUM-A-01", "Summary actual type 1", chapter_id, "T001", "0.1", "1"),
                    ("SEQ-SUM-A-02", "Summary actual type 2", chapter_id, "T002", "0.1", "1"),
                    ("SEQ-SUM-A-03", "Summary public missing type", chapter_id, "T003", "0.1", "1"),
                ],
            )
            conn.executemany(
                """
                INSERT INTO daily_plans (
                  plan_id, user_id, plan_date, plan_status, slogan, exam_date,
                  days_to_exam, type_index, type_id, type_name, question_id,
                  source, original_position_text, question_order, feedback_open_status,
                  chapter_id, student_type_sort_in_chapter, display_type_label,
                  is_chapter_boundary_after, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "P20260629-stu-summary-boundary",
                        user_id,
                        plan_date,
                        "in_progress",
                        "",
                        "2026-12-19",
                        "173",
                        "1",
                        "SEQ-SUM-A-01",
                        "Summary actual type 1",
                        "SEQ-SUM-A-01-Q01",
                        "880",
                        "A1 question",
                        "1",
                        "submitted",
                        chapter_id,
                        "1",
                        "题型1",
                        "0",
                        "2026-06-29 08:00:00",
                        "2026-06-29 08:00:00",
                    ),
                    (
                        "P20260629-stu-summary-boundary",
                        user_id,
                        plan_date,
                        "in_progress",
                        "",
                        "2026-12-19",
                        "173",
                        "2",
                        "SEQ-SUM-A-02",
                        "Summary actual type 2",
                        "SEQ-SUM-A-02-Q01",
                        "880",
                        "A2 question",
                        "1",
                        "submitted",
                        chapter_id,
                        "2",
                        "题型2",
                        "1",
                        "2026-06-29 08:00:00",
                        "2026-06-29 08:00:00",
                    ),
                ],
            )
            conn.executemany(
                """
                INSERT INTO question_feedbacks (
                  feedback_id, plan_id, user_id, plan_date, type_id, question_id,
                  result, is_wrong_record, wrong_reason_code, wrong_reason_name,
                  submitted_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "F-SUM-1",
                        "P20260629-stu-summary-boundary",
                        user_id,
                        plan_date,
                        "SEQ-SUM-A-01",
                        "SEQ-SUM-A-01-Q01",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-06-29 09:00:00",
                        "2026-06-29 09:00:00",
                        "2026-06-29 09:00:00",
                    ),
                    (
                        "F-SUM-2",
                        "P20260629-stu-summary-boundary",
                        user_id,
                        plan_date,
                        "SEQ-SUM-A-02",
                        "SEQ-SUM-A-02-Q01",
                        "wrong",
                        "1",
                        "calculation_error",
                        "计算失误",
                        "2026-06-29 09:10:00",
                        "2026-06-29 09:10:00",
                        "2026-06-29 09:10:00",
                    ),
                ],
            )
            conn.execute(
                """
                INSERT INTO chapter_summary_templates (
                  summary_template_id, raw_chapter_id, chapter_name, math_type,
                  plan_stage, summary_title, exam_focus, key_points,
                  common_mistakes, review_suggestions, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "CST-SUM-BOUNDARY",
                    chapter_id,
                    "Summary Chapter",
                    "数学二",
                    "强化",
                    "Summary Chapter Summary",
                    "exam focus",
                    "key points",
                    "common mistakes",
                    "review suggestions",
                    "1",
                    "2026-06-29 08:00:00",
                    "2026-06-29 08:00:00",
                ),
            )

            services.maybe_upsert_chapter_completion_after_feedback(
                conn,
                user_id,
                plan_date,
                "SEQ-SUM-A-02",
                "2026-06-29 09:10:00",
            )

            completion = conn.execute(
                """
                SELECT total_type_count, completed_type_count, submitted_question_count
                FROM student_chapter_completions
                WHERE user_id = ? AND raw_chapter_id = ?
                """,
                (user_id, chapter_id),
            ).fetchone()
            self.assertIsNotNone(completion)
            self.assertEqual(dict(completion)["total_type_count"], "2")
            self.assertEqual(dict(completion)["completed_type_count"], "2")
            self.assertEqual(dict(completion)["submitted_question_count"], "2")
        finally:
            conn.close()

    def test_chapter_summary_uses_actual_sequence_when_plan_boundary_flag_was_cleared_by_carryover(self) -> None:
        conn = self.make_conn()
        user_id = "stu-summary-carryover-boundary"
        plan_date = "2026-06-30"
        chapter_id = "SEQ-CARRY-A"
        try:
            services.ensure_growth_snapshot_tables(conn)
            conn.execute(
                """
                INSERT INTO student_profiles (user_id, math_type, current_stage, plan_variant_id)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, "M2", "stage", ""),
            )
            conn.executemany(
                """
                INSERT INTO question_types (
                  type_id, type_name, chapter_id, sort_code, suggested_days, direct_assignable
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-CARRY-A-01", "Carryover chapter type 1", chapter_id, "C001", "0.1", "1"),
                    ("SEQ-CARRY-A-02", "Carryover chapter type 2", chapter_id, "C002", "1.7", "1"),
                    ("SEQ-CARRY-B-01", "Next chapter type", "SEQ-CARRY-B", "C003", "0.1", "1"),
                ],
            )
            conn.executemany(
                """
                INSERT INTO questions (
                  question_id, type_id, book_id, applicable_levels, plan_stage,
                  original_position_text, question_order, display_permission,
                  is_active, question_note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-CARRY-A-01-Q01", "SEQ-CARRY-A-01", "m2_880", "", "stage", "A1 question", "1", "number", "1", ""),
                    ("SEQ-CARRY-A-02-Q01", "SEQ-CARRY-A-02", "m2_880", "", "stage", "A2 question", "1", "number", "1", ""),
                    ("SEQ-CARRY-B-01-Q01", "SEQ-CARRY-B-01", "m2_880", "", "stage", "B1 question", "1", "number", "1", ""),
                ],
            )
            conn.executemany(
                """
                INSERT INTO daily_plans (
                  plan_id, user_id, plan_date, plan_status, slogan, exam_date,
                  days_to_exam, type_index, type_id, type_name, question_id,
                  source, original_position_text, question_order, feedback_open_status,
                  chapter_id, student_type_sort_in_chapter, display_type_label,
                  is_chapter_boundary_after, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "P20260630-stu-summary-carryover-boundary",
                        user_id,
                        plan_date,
                        "completed",
                        "",
                        "2026-12-19",
                        "172",
                        "1",
                        "SEQ-CARRY-A-01",
                        "Carryover chapter type 1",
                        "SEQ-CARRY-A-01-Q01",
                        "880",
                        "A1 question",
                        "1",
                        "submitted",
                        chapter_id,
                        "1",
                        "Type 1",
                        "0",
                        "2026-06-30 08:00:00",
                        "2026-06-30 08:00:00",
                    ),
                    (
                        "P20260630-stu-summary-carryover-boundary",
                        user_id,
                        plan_date,
                        "completed",
                        "",
                        "2026-12-19",
                        "172",
                        "2",
                        "SEQ-CARRY-A-02",
                        "Carryover chapter type 2",
                        "SEQ-CARRY-A-02-Q01",
                        "880",
                        "A2 question",
                        "1",
                        "submitted",
                        chapter_id,
                        "2",
                        "Type 2",
                        "0",
                        "2026-06-30 08:00:00",
                        "2026-06-30 08:00:00",
                    ),
                ],
            )
            conn.executemany(
                """
                INSERT INTO question_feedbacks (
                  feedback_id, plan_id, user_id, plan_date, type_id, question_id,
                  result, is_wrong_record, wrong_reason_code, wrong_reason_name,
                  submitted_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "F-CARRY-SUM-1",
                        "P20260630-stu-summary-carryover-boundary",
                        user_id,
                        plan_date,
                        "SEQ-CARRY-A-01",
                        "SEQ-CARRY-A-01-Q01",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-06-30 09:00:00",
                        "2026-06-30 09:00:00",
                        "2026-06-30 09:00:00",
                    ),
                    (
                        "F-CARRY-SUM-2",
                        "P20260630-stu-summary-carryover-boundary",
                        user_id,
                        plan_date,
                        "SEQ-CARRY-A-02",
                        "SEQ-CARRY-A-02-Q01",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-06-30 09:10:00",
                        "2026-06-30 09:10:00",
                        "2026-06-30 09:10:00",
                    ),
                ],
            )
            conn.execute(
                """
                INSERT INTO chapter_summary_templates (
                  summary_template_id, raw_chapter_id, chapter_name, math_type,
                  plan_stage, summary_title, exam_focus, key_points,
                  common_mistakes, review_suggestions, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "CST-CARRY-BOUNDARY",
                    chapter_id,
                    "Carryover Summary Chapter",
                    "M2",
                    "stage",
                    "Carryover Summary Chapter Summary",
                    "exam focus",
                    "key points",
                    "common mistakes",
                    "review suggestions",
                    "1",
                    "2026-06-30 08:00:00",
                    "2026-06-30 08:00:00",
                ),
            )

            services.maybe_upsert_chapter_completion_after_feedback(
                conn,
                user_id,
                plan_date,
                "SEQ-CARRY-A-02",
                "2026-06-30 09:10:00",
            )

            completion = conn.execute(
                """
                SELECT total_type_count, completed_type_count, submitted_question_count
                FROM student_chapter_completions
                WHERE user_id = ? AND raw_chapter_id = ?
                """,
                (user_id, chapter_id),
            ).fetchone()
            self.assertIsNotNone(completion)
            self.assertEqual(dict(completion)["total_type_count"], "2")
            self.assertEqual(dict(completion)["completed_type_count"], "2")
            self.assertEqual(dict(completion)["submitted_question_count"], "2")
        finally:
            conn.close()

    def test_chapter_summary_waits_until_split_final_type_carryover_is_done(self) -> None:
        conn = self.make_conn()
        user_id = "stu-summary-final-carryover"
        first_date = "2026-07-01"
        second_date = "2026-07-02"
        chapter_id = "SEQ-FINAL-CARRY-A"
        try:
            services.ensure_growth_snapshot_tables(conn)
            conn.execute(
                """
                INSERT INTO student_profiles (user_id, math_type, current_stage, plan_variant_id)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, "M2", "stage", ""),
            )
            conn.execute(
                """
                INSERT INTO student_progress (
                  user_id, last_generated_plan_date, current_type_status,
                  carryover_type_id, carryover_question_ids, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    first_date,
                    "carryover",
                    "SEQ-FINAL-CARRY-A-02",
                    json.dumps(["SEQ-FINAL-CARRY-A-02-Q02"]),
                    "2026-07-01 09:10:00",
                ),
            )
            conn.executemany(
                """
                INSERT INTO question_types (
                  type_id, type_name, chapter_id, sort_code, suggested_days, direct_assignable
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-FINAL-CARRY-A-01", "Final carry chapter type 1", chapter_id, "F001", "0.1", "1"),
                    ("SEQ-FINAL-CARRY-A-02", "Final carry chapter type 2", chapter_id, "F002", "1.7", "1"),
                    ("SEQ-FINAL-CARRY-B-01", "Next chapter type", "SEQ-FINAL-CARRY-B", "F003", "0.1", "1"),
                ],
            )
            conn.executemany(
                """
                INSERT INTO questions (
                  question_id, type_id, book_id, applicable_levels, plan_stage,
                  original_position_text, question_order, display_permission,
                  is_active, question_note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SEQ-FINAL-CARRY-A-01-Q01", "SEQ-FINAL-CARRY-A-01", "m2_880", "", "stage", "A1 question", "1", "number", "1", ""),
                    ("SEQ-FINAL-CARRY-A-02-Q01", "SEQ-FINAL-CARRY-A-02", "m2_880", "", "stage", "A2 question first part", "1", "number", "1", ""),
                    ("SEQ-FINAL-CARRY-A-02-Q02", "SEQ-FINAL-CARRY-A-02", "m2_880", "", "stage", "A2 question carryover rest", "2", "number", "1", ""),
                    ("SEQ-FINAL-CARRY-B-01-Q01", "SEQ-FINAL-CARRY-B-01", "m2_880", "", "stage", "B1 question", "1", "number", "1", ""),
                ],
            )
            conn.executemany(
                """
                INSERT INTO daily_plans (
                  plan_id, user_id, plan_date, plan_status, slogan, exam_date,
                  days_to_exam, type_index, type_id, type_name, question_id,
                  source, original_position_text, question_order, feedback_open_status,
                  chapter_id, student_type_sort_in_chapter, display_type_label,
                  is_chapter_boundary_after, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "P20260701-stu-summary-final-carryover",
                        user_id,
                        first_date,
                        "completed",
                        "",
                        "2026-12-19",
                        "171",
                        "1",
                        "SEQ-FINAL-CARRY-A-01",
                        "Final carry chapter type 1",
                        "SEQ-FINAL-CARRY-A-01-Q01",
                        "880",
                        "A1 question",
                        "1",
                        "submitted",
                        chapter_id,
                        "1",
                        "Type 1",
                        "0",
                        "2026-07-01 08:00:00",
                        "2026-07-01 08:00:00",
                    ),
                    (
                        "P20260701-stu-summary-final-carryover",
                        user_id,
                        first_date,
                        "completed",
                        "",
                        "2026-12-19",
                        "171",
                        "2",
                        "SEQ-FINAL-CARRY-A-02",
                        "Final carry chapter type 2",
                        "SEQ-FINAL-CARRY-A-02-Q01",
                        "880",
                        "A2 question first part",
                        "1",
                        "submitted",
                        chapter_id,
                        "2",
                        "Type 2",
                        "0",
                        "2026-07-01 08:00:00",
                        "2026-07-01 08:00:00",
                    ),
                    (
                        "P20260702-stu-summary-final-carryover",
                        user_id,
                        second_date,
                        "completed",
                        "",
                        "2026-12-19",
                        "170",
                        "1",
                        "SEQ-FINAL-CARRY-A-02",
                        "Final carry chapter type 2",
                        "SEQ-FINAL-CARRY-A-02-Q02",
                        "880",
                        "A2 question carryover rest",
                        "1",
                        "submitted",
                        chapter_id,
                        "2",
                        "Type 2",
                        "1",
                        "2026-07-02 08:00:00",
                        "2026-07-02 08:00:00",
                    ),
                ],
            )
            conn.executemany(
                """
                INSERT INTO question_feedbacks (
                  feedback_id, plan_id, user_id, plan_date, type_id, question_id,
                  result, is_wrong_record, wrong_reason_code, wrong_reason_name,
                  submitted_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "F-FINAL-CARRY-SUM-1",
                        "P20260701-stu-summary-final-carryover",
                        user_id,
                        first_date,
                        "SEQ-FINAL-CARRY-A-01",
                        "SEQ-FINAL-CARRY-A-01-Q01",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-07-01 09:00:00",
                        "2026-07-01 09:00:00",
                        "2026-07-01 09:00:00",
                    ),
                    (
                        "F-FINAL-CARRY-SUM-2A",
                        "P20260701-stu-summary-final-carryover",
                        user_id,
                        first_date,
                        "SEQ-FINAL-CARRY-A-02",
                        "SEQ-FINAL-CARRY-A-02-Q01",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-07-01 09:10:00",
                        "2026-07-01 09:10:00",
                        "2026-07-01 09:10:00",
                    ),
                    (
                        "F-FINAL-CARRY-SUM-2B",
                        "P20260702-stu-summary-final-carryover",
                        user_id,
                        second_date,
                        "SEQ-FINAL-CARRY-A-02",
                        "SEQ-FINAL-CARRY-A-02-Q02",
                        "correct",
                        "0",
                        "",
                        "",
                        "2026-07-02 09:10:00",
                        "2026-07-02 09:10:00",
                        "2026-07-02 09:10:00",
                    ),
                ],
            )
            conn.execute(
                """
                INSERT INTO chapter_summary_templates (
                  summary_template_id, raw_chapter_id, chapter_name, math_type,
                  plan_stage, summary_title, exam_focus, key_points,
                  common_mistakes, review_suggestions, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "CST-FINAL-CARRY-BOUNDARY",
                    chapter_id,
                    "Final Carry Summary Chapter",
                    "M2",
                    "stage",
                    "Final Carry Summary Chapter Summary",
                    "exam focus",
                    "key points",
                    "common mistakes",
                    "review suggestions",
                    "1",
                    "2026-07-01 08:00:00",
                    "2026-07-01 08:00:00",
                ),
            )

            services.maybe_upsert_chapter_completion_after_feedback(
                conn,
                user_id,
                first_date,
                "SEQ-FINAL-CARRY-A-02",
                "2026-07-01 09:10:00",
            )
            early_completion = conn.execute(
                """
                SELECT completion_id
                FROM student_chapter_completions
                WHERE user_id = ? AND raw_chapter_id = ?
                """,
                (user_id, chapter_id),
            ).fetchone()
            self.assertIsNone(early_completion)

            conn.execute(
                """
                UPDATE student_progress
                SET current_type_status = 'active',
                    carryover_type_id = '',
                    carryover_question_ids = '[]',
                    updated_at = ?
                WHERE user_id = ?
                """,
                ("2026-07-02 09:10:00", user_id),
            )
            services.maybe_upsert_chapter_completion_after_feedback(
                conn,
                user_id,
                second_date,
                "SEQ-FINAL-CARRY-A-02",
                "2026-07-02 09:10:00",
            )
            completion = conn.execute(
                """
                SELECT completed_at, total_type_count, completed_type_count, submitted_question_count
                FROM student_chapter_completions
                WHERE user_id = ? AND raw_chapter_id = ?
                """,
                (user_id, chapter_id),
            ).fetchone()
            self.assertIsNotNone(completion)
            self.assertEqual(dict(completion)["completed_at"], "2026-07-02 09:10:00")
            self.assertEqual(dict(completion)["total_type_count"], "2")
            self.assertEqual(dict(completion)["completed_type_count"], "2")
            self.assertEqual(dict(completion)["submitted_question_count"], "3")
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
