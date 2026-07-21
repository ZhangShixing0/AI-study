from __future__ import annotations

import sqlite3
import unittest

from backend import services


class StudentProfileBookMigrationTest(unittest.TestCase):
    def make_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE student_profiles (
              user_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL DEFAULT '',
              primary_book_1 TEXT NOT NULL DEFAULT '',
              primary_book_2 TEXT NOT NULL DEFAULT '',
              backup_book TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT ''
            );
            """
        )
        conn.executemany(
            """
            INSERT INTO student_profiles (
              user_id, math_type, primary_book_1, primary_book_2, backup_book, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("legacy-m2", "数学二", "880", "1000", "660", "2026-06-01 08:00:00"),
                ("already-stable", "数学二", "m2_880", "m2_1000", "m2_660", "2026-06-01 08:00:00"),
                ("legacy-m1", "数学一", "880", "1000", "", "2026-06-01 08:00:00"),
                ("legacy-source-name", "数学二", "严选题", "严选题基础篇", "880题", "2026-06-01 08:00:00"),
                ("blank-math-type", "", "880", "", "660", "2026-06-01 08:00:00"),
            ],
        )
        return conn

    def test_canonicalizes_existing_student_profile_book_values_once(self) -> None:
        conn = self.make_conn()
        try:
            first_result = services.canonicalize_student_profile_book_ids(conn, updated_at="2026-06-28 10:00:00")

            self.assertEqual(first_result, {"updated_rows": 4, "updated_values": 10})
            rows = {
                row["user_id"]: dict(row)
                for row in conn.execute(
                    """
                    SELECT user_id, primary_book_1, primary_book_2, backup_book, updated_at
                    FROM student_profiles
                    ORDER BY user_id
                    """
                ).fetchall()
            }
            self.assertEqual(rows["legacy-m2"]["primary_book_1"], "m2_880")
            self.assertEqual(rows["legacy-m2"]["primary_book_2"], "m2_1000")
            self.assertEqual(rows["legacy-m2"]["backup_book"], "m2_660")
            self.assertEqual(rows["legacy-m1"]["primary_book_1"], "m1_880")
            self.assertEqual(rows["legacy-m1"]["primary_book_2"], "m1_1000")
            self.assertEqual(rows["legacy-m1"]["backup_book"], "")
            self.assertEqual(rows["legacy-source-name"]["primary_book_1"], "m2_yanxuan")
            self.assertEqual(rows["legacy-source-name"]["primary_book_2"], "m2_yanxuan_basic")
            self.assertEqual(rows["legacy-source-name"]["backup_book"], "m2_880")
            self.assertEqual(rows["blank-math-type"]["primary_book_1"], "m2_880")
            self.assertEqual(rows["blank-math-type"]["backup_book"], "m2_660")
            self.assertEqual(rows["already-stable"]["updated_at"], "2026-06-01 08:00:00")

            second_result = services.canonicalize_student_profile_book_ids(conn, updated_at="2026-06-28 10:05:00")

            self.assertEqual(second_result, {"updated_rows": 0, "updated_values": 0})
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
