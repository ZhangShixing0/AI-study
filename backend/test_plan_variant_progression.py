from __future__ import annotations

import sqlite3
import unittest

from backend import services


class PlanVariantProgressionTest(unittest.TestCase):
    def make_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE question_types (
              type_id TEXT PRIMARY KEY,
              type_name TEXT NOT NULL,
              sort_code TEXT NOT NULL,
              suggested_days TEXT NOT NULL,
              direct_assignable TEXT NOT NULL
            );
            CREATE TABLE question_type_orders (
              plan_variant_id TEXT NOT NULL,
              type_id TEXT NOT NULL,
              sort_code TEXT NOT NULL,
              suggested_days TEXT NOT NULL,
              direct_assignable TEXT NOT NULL,
              is_active TEXT NOT NULL,
              PRIMARY KEY (plan_variant_id, type_id)
            );
            """
        )
        conn.executemany(
            """
            INSERT INTO question_types (
              type_id, type_name, sort_code, suggested_days, direct_assignable
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("T-GAOSHU", "高数题型", "001", "0.4", "1"),
                ("T-LINEAR", "线代题型", "002", "0.4", "1"),
            ],
        )
        conn.executemany(
            """
            INSERT INTO question_type_orders (
              plan_variant_id, type_id, sort_code, suggested_days,
              direct_assignable, is_active
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("math2_gaoshu_first", "T-LINEAR", "001", "0.4", "1", "1"),
                ("math2_gaoshu_first", "T-GAOSHU", "002", "0.4", "1", "1"),
            ],
        )
        return conn

    def test_next_assignable_type_uses_student_plan_variant_order(self) -> None:
        conn = self.make_conn()
        try:
            first_type = services.next_assignable_type(conn, "", "math2_gaoshu_first")
            second_type = services.next_assignable_type(conn, "T-LINEAR", "math2_gaoshu_first")

            self.assertEqual(first_type["type_id"], "T-LINEAR")
            self.assertEqual(first_type["sort_code"], "001")
            self.assertEqual(second_type["type_id"], "T-GAOSHU")
            self.assertEqual(second_type["sort_code"], "002")
        finally:
            conn.close()

    def test_next_assignable_type_falls_back_to_global_order_without_variant_rows(self) -> None:
        conn = self.make_conn()
        try:
            first_type = services.next_assignable_type(conn, "", "math2_mixed")

            self.assertEqual(first_type["type_id"], "T-GAOSHU")
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
