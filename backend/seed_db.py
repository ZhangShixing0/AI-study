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

        for statement in INDEXES:
            conn.execute(statement)

        conn.commit()


if __name__ == "__main__":
    seed_database()
    print(f"Seeded SQLite database: {DB_PATH}")
