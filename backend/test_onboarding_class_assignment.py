from __future__ import annotations

import sqlite3
import unittest

from backend import services


class OnboardingClassAssignmentTest(unittest.TestCase):
    def make_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE users (
              user_id TEXT PRIMARY KEY,
              role TEXT NOT NULL DEFAULT 'student',
              account_status TEXT NOT NULL
            );
            CREATE TABLE student_profiles (
              user_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL,
              level TEXT NOT NULL,
              class_id TEXT NOT NULL
            );
            CREATE TABLE classes (
              class_id TEXT PRIMARY KEY,
              class_name TEXT NOT NULL,
              math_type TEXT NOT NULL,
              target_exam_year TEXT NOT NULL,
              level TEXT NOT NULL,
              teacher_user_id TEXT,
              group_name TEXT,
              qq_group_number TEXT,
              capacity TEXT NOT NULL,
              is_accepting_new_students TEXT NOT NULL,
              is_test_class TEXT NOT NULL,
              note TEXT
            );
            CREATE TABLE class_intake_settings (
              math_type TEXT NOT NULL,
              level TEXT NOT NULL,
              active_class_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT '',
              updated_by TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT '',
              PRIMARY KEY (math_type, level)
            );
            """
        )
        conn.executemany(
            """
            INSERT INTO classes (
              class_id, class_name, math_type, target_exam_year, level,
              teacher_user_id, group_name, qq_group_number, capacity,
              is_accepting_new_students, is_test_class, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("A201", "数学二A班", "数学二", "2027", "A", "t001", "A班QQ群", "746056792", "1", "1", "0", ""),
                ("A202", "数学二A02班", "数学二", "2027", "A", "t001", "A02班QQ群", "746056793", "2", "1", "0", ""),
            ],
        )
        conn.execute(
            """
            INSERT INTO class_intake_settings (
              math_type, level, active_class_id, status, updated_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("数学二", "A", "A201", "正常接收", "system", "2026-06-27"),
        )
        return conn

    def test_onboarding_class_assignment_skips_full_active_class(self) -> None:
        conn = self.make_conn()
        try:
            conn.execute("INSERT INTO users (user_id, role, account_status) VALUES (?, ?, ?)", ("stu-a201", "student", "active"))
            conn.execute(
                "INSERT INTO student_profiles (user_id, math_type, level, class_id) VALUES (?, ?, ?, ?)",
                ("stu-a201", "数学二", "A", "A201"),
            )

            self.assertEqual(services.resolve_onboarding_class_id(conn, "数学二", "A"), "A202")
        finally:
            conn.close()

    def test_onboarding_class_assignment_prefers_active_class_with_capacity(self) -> None:
        conn = self.make_conn()
        try:
            conn.execute("UPDATE classes SET capacity = ? WHERE class_id = ?", ("2", "A201"))

            self.assertEqual(services.resolve_onboarding_class_id(conn, "数学二", "A"), "A201")
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
