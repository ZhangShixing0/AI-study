import os
import sys
import types
import unittest
from unittest.mock import patch

from backend import db, public_seed


class PostgresRuntimeDbTests(unittest.TestCase):
    def test_runtime_database_backend_prefers_sqlite_without_database_url(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(db.runtime_database_backend(), "sqlite")

    def test_runtime_database_backend_uses_postgres_when_database_url_is_set(self):
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"}, clear=True):
            self.assertEqual(db.runtime_database_backend(), "postgres")

    def test_translate_placeholders_for_postgres(self):
        sql, params = db.translate_sql_for_postgres(
            "SELECT * FROM users WHERE user_id = ? AND role = ?",
            ("10001", "student"),
        )

        self.assertEqual(sql, "SELECT * FROM users WHERE user_id = %s AND role = %s")
        self.assertEqual(params, ("10001", "student"))

    def test_translate_escapes_literal_percent_for_psycopg(self):
        sql, params = db.translate_sql_for_postgres(
            "SELECT * FROM users WHERE login_account LIKE 'stu%' AND role = ?",
            ("student",),
        )

        self.assertEqual(sql, "SELECT * FROM users WHERE login_account LIKE 'stu%%' AND role = %s")
        self.assertEqual(params, ("student",))

    def test_translate_preserves_existing_psycopg_placeholder(self):
        sql, params = db.translate_sql_for_postgres(
            "SELECT to_regclass(%s) AS table_ref",
            ("public.question_type_orders",),
        )

        self.assertEqual(sql, "SELECT to_regclass(%s) AS table_ref")
        self.assertEqual(params, ("public.question_type_orders",))

    def test_postgres_connection_preserves_existing_psycopg_placeholder(self):
        calls = {}

        class FakeConnection:
            def execute(self, sql, params=None):
                calls["sql"] = sql
                calls["params"] = params
                return types.SimpleNamespace(fetchone=lambda: {"table_ref": "question_type_orders"})

        conn = db.PostgresConnection(FakeConnection())
        query, params = db.table_exists_query("question_type_orders", "postgres")
        conn.execute(query, params).fetchone()

        self.assertEqual(calls["sql"], "SELECT to_regclass(%s) AS table_ref")
        self.assertEqual(calls["params"], ("public.question_type_orders",))

    def test_postgres_connection_executemany_translates_and_executes_each_row(self):
        calls = []

        class FakeConnection:
            def execute(self, sql, params=None):
                calls.append((sql, params))
                return types.SimpleNamespace()

        conn = db.PostgresConnection(FakeConnection())
        conn.executemany(
            "INSERT INTO daily_plans (plan_id, user_id) VALUES (?, ?)",
            [("P1", "60001"), ("P2", "60001")],
        )

        self.assertEqual(
            calls,
            [
                ("INSERT INTO daily_plans (plan_id, user_id) VALUES (%s, %s)", ("P1", "60001")),
                ("INSERT INTO daily_plans (plan_id, user_id) VALUES (%s, %s)", ("P2", "60001")),
            ],
        )

    def test_public_seed_postgres_sql_escapes_literal_percent(self):
        sql = public_seed._sql_for_dialect(
            "SELECT * FROM institutions WHERE search_keywords LIKE ? OR school_name LIKE 'A%'",
            "postgres",
        )

        self.assertEqual(
            sql,
            "SELECT * FROM institutions WHERE search_keywords LIKE %s OR school_name LIKE 'A%%'",
        )

    def test_public_seed_postgres_sql_preserves_existing_placeholder(self):
        sql = public_seed._sql_for_dialect(
            "SELECT to_regclass(%s) AS table_ref",
            "postgres",
        )

        self.assertEqual(sql, "SELECT to_regclass(%s) AS table_ref")

    def test_translate_pragma_table_info_for_postgres(self):
        sql, params = db.translate_sql_for_postgres("PRAGMA table_info(student_profiles)")

        self.assertIn("information_schema.columns", sql)
        self.assertIn("table_name = %s", sql)
        self.assertEqual(params, ("student_profiles",))

    def test_translate_insert_or_ignore_for_postgres(self):
        sql, params = db.translate_sql_for_postgres(
            "INSERT OR IGNORE INTO test_runtime_state (state_key, state_value) VALUES (?, ?)",
            ("current_test_date", "2026-06-10"),
        )

        self.assertEqual(params, ("current_test_date", "2026-06-10"))
        self.assertIn("INSERT INTO test_runtime_state", sql)
        self.assertIn("ON CONFLICT DO NOTHING", sql)

    def test_translate_insert_or_replace_for_known_table(self):
        sql, params = db.translate_sql_for_postgres(
            """
            INSERT OR REPLACE INTO class_intake_settings (
              math_type, level, active_class_id, status
            ) VALUES (?, ?, ?, ?)
            """,
            ("math2", "A", "m2_A_01", "open"),
        )

        self.assertEqual(params, ("math2", "A", "m2_A_01", "open"))
        self.assertIn("INSERT INTO class_intake_settings", sql)
        self.assertIn("ON CONFLICT (math_type, level) DO UPDATE SET", sql)
        self.assertIn("active_class_id = EXCLUDED.active_class_id", sql)
        self.assertIn("status = EXCLUDED.status", sql)

    def test_unknown_replace_table_fails_clearly(self):
        with self.assertRaisesRegex(ValueError, "No PostgreSQL conflict key configured"):
            db.translate_sql_for_postgres(
                "INSERT OR REPLACE INTO unknown_table (id, value) VALUES (?, ?)",
                ("1", "x"),
            )

    def test_get_connection_uses_psycopg_when_database_url_exists(self):
        calls = {}

        class FakeConnection:
            def execute(self, sql, params=None):
                calls["sql"] = sql
                calls["params"] = params
                return types.SimpleNamespace(fetchone=lambda: None, fetchall=lambda: [])

            def commit(self):
                calls["committed"] = True

            def close(self):
                calls["closed"] = True

        def fake_connect(database_url, row_factory=None):
            calls["database_url"] = database_url
            calls["row_factory"] = row_factory
            return FakeConnection()

        fake_rows = types.SimpleNamespace(dict_row=object())
        fake_psycopg = types.SimpleNamespace(connect=fake_connect)

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"}, clear=True):
            with patch.dict(sys.modules, {"psycopg": fake_psycopg, "psycopg.rows": fake_rows}):
                conn = db.get_connection()
                conn.execute("SELECT * FROM users WHERE user_id = ?", ("10001",))
                conn.commit()
                conn.close()

        self.assertEqual(calls["database_url"], "postgresql://user:pass@localhost/db")
        self.assertEqual(calls["sql"], "SELECT * FROM users WHERE user_id = %s")
        self.assertEqual(calls["params"], ("10001",))
        self.assertTrue(calls["committed"])
        self.assertTrue(calls["closed"])

    def test_production_requires_database_url(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL is required"):
                db.assert_runtime_database_ready()

    def test_table_info_query_helper_for_postgres(self):
        sql, params = db.table_info_query("student_profiles", "postgres")

        self.assertIn("information_schema.columns", sql)
        self.assertEqual(params, ("student_profiles",))

    def test_table_exists_query_helper_for_postgres(self):
        sql, params = db.table_exists_query("student_profiles", "postgres")

        self.assertIn("to_regclass", sql)
        self.assertEqual(params, ("public.student_profiles",))

    def test_row_to_dict_aliases_postgres_lowercase_qq(self):
        row = db.row_to_dict({"user_id": "10001", "qq": "123456789"})

        self.assertEqual(row["qq"], "123456789")
        self.assertEqual(row["QQ"], "123456789")


if __name__ == "__main__":
    unittest.main()
