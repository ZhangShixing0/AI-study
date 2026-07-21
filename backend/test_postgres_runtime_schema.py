from pathlib import Path
import unittest


SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "production-seed"
    / "postgres_runtime_schema.sql"
)
PUBLIC_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "production-seed"
    / "postgres_schema.sql"
)
SERVICES_PATH = Path(__file__).resolve().with_name("services.py")


class PostgresRuntimeSchemaTests(unittest.TestCase):
    def test_runtime_schema_file_exists(self):
        self.assertTrue(SCHEMA_PATH.exists())

    def test_runtime_schema_contains_required_tables(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8")
        required_tables = [
            "users",
            "user_sessions",
            "test_access_codes",
            "test_user_dates",
            "test_runtime_state",
            "student_profiles",
            "student_progress",
            "daily_plans",
            "question_feedbacks",
            "student_daily_activity",
            "student_weekly_targets",
            "student_stats",
            "type_mastery_stats",
            "loss_reason_stats",
            "student_chapter_completions",
            "study_rooms",
            "student_study_goals",
            "focus_sessions",
            "study_room_members",
            "announcements",
            "announcement_reads",
            "admin_audit_logs",
            "formal_account_previews",
            "admin_totp_state",
            "system_messages",
        ]
        for table_name in required_tables:
            pattern = rf"create\s+table\s+if\s+not\s+exists\s+public\.{table_name}\b"
            self.assertRegex(sql.lower(), pattern, table_name)

    def test_runtime_schema_has_conflict_keys_needed_by_adapter(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        expected_constraints = [
            "primary key (user_id)",
            "primary key (progress_id)",
            "primary key (goal_id)",
            "primary key (math_type, level)",
            "primary key (admin_user_id)",
        ]
        for constraint in expected_constraints:
            self.assertIn(constraint, sql)

    def test_class_intake_settings_keeps_setting_id_unique_for_seed_upsert(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        self.assertRegex(
            sql,
            r"create\s+unique\s+index\s+if\s+not\s+exists\s+"
            r"idx_class_intake_settings_setting_id\s+on\s+"
            r"public\.class_intake_settings\s*\(setting_id\)",
        )

    def test_runtime_schema_seeds_class_bound_study_rooms(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        self.assertIn("class_id text not null default ''", sql)
        self.assertRegex(
            sql,
            r"create\s+unique\s+index\s+if\s+not\s+exists\s+"
            r"idx_study_rooms_class_id\s+on\s+public\.study_rooms\s*\(class_id\)",
        )
        self.assertIn("where class_id <> ''", sql)
        for class_id in ("a201", "b201", "c201", "d201"):
            self.assertIn(f"sr-m2-2026-{class_id}", sql)
            self.assertIn(f"'{class_id}'", sql)

    def test_runtime_schema_seeds_default_admin_user(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        self.assertIn("insert into public.users", sql)
        self.assertIn("'adm001'", sql)
        self.assertIn("'admin'", sql)
        self.assertIn("'全局运营管理员'", sql)
        self.assertIn("on conflict (user_id) do update", sql)
        self.assertIn("insert into public.admin_totp_state", sql)

    def test_runtime_schema_seeds_internal_test_students(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        self.assertIn("'internal_test'", sql)
        for number in range(10001, 10011):
            self.assertIn(f"'stu{number}'", sql)
            self.assertIn(f"'{number}'", sql)
            self.assertIn(f"'pr-{number}'", sql)
        self.assertIn("insert into public.student_profiles", sql)
        self.assertIn("insert into public.student_progress", sql)
        self.assertIn("'m2_880'", sql)
        self.assertIn("'m2_1000'", sql)
        self.assertIn("'m2_660'", sql)

    def test_daily_plans_keeps_actual_sequence_fields(self):
        sql = SCHEMA_PATH.read_text(encoding="utf-8").lower()
        for column in (
            "chapter_id text not null default ''",
            "student_type_sort_in_chapter text not null default '0'",
            "display_type_label text not null default ''",
            "is_chapter_boundary_after text not null default '0'",
        ):
            self.assertIn(column, sql)

    def test_public_schema_repairs_runtime_created_chapter_tables(self):
        sql = PUBLIC_SCHEMA_PATH.read_text(encoding="utf-8").lower()
        for column in (
            "chapter_alias",
            "created_at",
            "updated_at",
            "imported_at",
            "import_source",
        ):
            self.assertRegex(
                sql,
                rf"alter\s+table\s+public\.chapters[\s\S]*add\s+column\s+if\s+not\s+exists\s+{column}\b",
            )
        self.assertIn("alter column is_active type boolean", sql)
        for column in (
            "chapter_code",
            "display_chapter_name",
            "source_sheet",
            "source_pdf",
            "source_pdf_page",
            "note",
            "created_at",
            "updated_at",
            "imported_at",
            "import_source",
        ):
            self.assertRegex(
                sql,
                rf"alter\s+table\s+public\.chapter_orders[\s\S]*add\s+column\s+if\s+not\s+exists\s+{column}\b",
            )
        self.assertIn("alter column chapter_sort type integer", sql)

    def test_teacher_creation_does_not_use_sqlite_only_glob(self):
        source = SERVICES_PATH.read_text(encoding="utf-8")
        self.assertNotIn(
            "GLOB",
            source,
            "teacher creation runs on PostgreSQL in production and must not use SQLite-only GLOB syntax",
        )


if __name__ == "__main__":
    unittest.main()
