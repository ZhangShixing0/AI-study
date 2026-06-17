from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

from .settings import DB_PATH, SAMPLE_DATA_DIR


TABLE_FILES = [
    "users",
    "user_sessions",
    "classes",
    "student_profiles",
    "institutions",
    "student_progress",
    "question_types",
    "questions",
    "daily_plans",
    "question_feedbacks",
    "student_stats",
    "student_daily_activity",
    "type_mastery_stats",
    "loss_reason_stats",
    "priority_recommendations",
    "study_rooms",
    "student_study_goals",
    "study_room_members",
    "focus_sessions",
    "system_messages",
]

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_users_login_account ON users(login_account)",
    "CREATE INDEX IF NOT EXISTS idx_institutions_name ON institutions(school_name)",
    "CREATE INDEX IF NOT EXISTS idx_progress_user ON student_progress(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_question_types_sort ON question_types(sort_code)",
    "CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type_id, source, plan_stage)",
    "CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, plan_date)",
    "CREATE INDEX IF NOT EXISTS idx_feedbacks_plan_user_type ON question_feedbacks(plan_id, user_id, type_id)",
    "CREATE INDEX IF NOT EXISTS idx_stats_user_date ON student_stats(user_id, stat_date)",
    "CREATE INDEX IF NOT EXISTS idx_stats_date ON student_stats(stat_date)",
    "CREATE INDEX IF NOT EXISTS idx_activity_user_date ON student_daily_activity(user_id, activity_date)",
    "CREATE INDEX IF NOT EXISTS idx_mastery_user_date ON type_mastery_stats(user_id, stat_date)",
    "CREATE INDEX IF NOT EXISTS idx_losses_user_date ON loss_reason_stats(user_id, stat_date)",
    "CREATE INDEX IF NOT EXISTS idx_priority_user_date ON priority_recommendations(user_id, stat_date)",
    "CREATE INDEX IF NOT EXISTS idx_goals_user_date ON student_study_goals(user_id, study_date)",
    "CREATE INDEX IF NOT EXISTS idx_room_members_room ON study_room_members(room_id, online_status)",
    "CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, plan_date)",
    "CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_access_codes_code ON test_access_codes(code)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_user_dates_user ON test_user_dates(user_id)",
]


DEFAULT_TEST_ACCESS_CODES = [
    ("demo-a01", "10001", "claimed"),
    ("demo-b01", "10002", "claimed"),
    ("new-a01", "", "unused"),
    ("new-b01", "", "unused"),
]


def read_workbook(table_name: str) -> pd.DataFrame:
    path = SAMPLE_DATA_DIR / f"{table_name}.xlsx"
    if not path.exists():
        raise FileNotFoundError(f"Missing sample table: {path}")
    return pd.read_excel(path, dtype=str).fillna("")


def seed_database(db_path: Path = DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    with sqlite3.connect(db_path) as conn:
        for table_name in TABLE_FILES:
            df = read_workbook(table_name)
            df.to_sql(table_name, conn, if_exists="replace", index=False)

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS test_access_codes (
              code TEXT PRIMARY KEY,
              user_id TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'unused',
              created_at TEXT NOT NULL,
              claimed_at TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL
            )
            """
        )
        for code, user_id, status in DEFAULT_TEST_ACCESS_CODES:
            conn.execute(
                """
                INSERT INTO test_access_codes (code, user_id, status, created_at, claimed_at, updated_at)
                VALUES (?, ?, ?, '2026-06-10 06:00:00', ?, '2026-06-10 06:00:00')
                """,
                (code, user_id, status, "2026-06-10 06:00:00" if user_id else ""),
            )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS test_user_dates (
              user_id TEXT PRIMARY KEY,
              current_test_date TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO test_user_dates (user_id, current_test_date, created_at, updated_at)
            SELECT user_id, '2026-06-10', '2026-06-10 06:00:00', '2026-06-10 06:00:00'
            FROM users
            WHERE role = 'student'
            """
        )

        progress_columns = {
            row[1]
            for row in conn.execute("PRAGMA table_info(student_progress)").fetchall()
        }
        if "current_type_status" not in progress_columns:
            conn.execute(
                "ALTER TABLE student_progress ADD COLUMN current_type_status TEXT NOT NULL DEFAULT 'active'"
            )

        feedback_columns = {
            row[1]
            for row in conn.execute("PRAGMA table_info(question_feedbacks)").fetchall()
        }
        if "wrong_reason_code" not in feedback_columns:
            conn.execute(
                "ALTER TABLE question_feedbacks ADD COLUMN wrong_reason_code TEXT NOT NULL DEFAULT ''"
            )
        if "wrong_reason_name" not in feedback_columns:
            conn.execute(
                "ALTER TABLE question_feedbacks ADD COLUMN wrong_reason_name TEXT NOT NULL DEFAULT ''"
            )
        if "unattempted_action" not in feedback_columns:
            conn.execute(
                "ALTER TABLE question_feedbacks ADD COLUMN unattempted_action TEXT NOT NULL DEFAULT ''"
            )

        for statement in INDEXES:
            conn.execute(statement)

        conn.commit()


if __name__ == "__main__":
    seed_database()
    print(f"Seeded SQLite database: {DB_PATH}")
