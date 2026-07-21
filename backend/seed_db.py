from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

from .services import (
    ensure_admin_console_tables,
    ensure_daily_plan_sequence_columns,
    ensure_formal_activation_tables,
    ensure_growth_snapshot_tables,
    ensure_question_source_display_columns,
    ensure_student_progress_tracking_columns,
    ensure_student_profile_target_school_columns,
    ensure_study_room_tables,
    now_text,
)
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
    "student_chapter_completions",
    "chapter_summary_templates",
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
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_study_rooms_class_id ON study_rooms(class_id) WHERE class_id <> ''",
    "CREATE INDEX IF NOT EXISTS idx_goals_user_date ON student_study_goals(user_id, study_date)",
    "CREATE INDEX IF NOT EXISTS idx_room_members_room ON study_room_members(room_id, online_status)",
    "CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, plan_date)",
    "CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_access_codes_code ON test_access_codes(code)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_user_dates_user ON test_user_dates(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements(status, published_at)",
    "CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, announcement_id)",
    "CREATE INDEX IF NOT EXISTS idx_feedbacks_user_date_type ON question_feedbacks(user_id, plan_date, type_id)",
    "CREATE INDEX IF NOT EXISTS idx_feedbacks_user_reason ON question_feedbacks(user_id, wrong_reason_code)",
    "CREATE INDEX IF NOT EXISTS idx_daily_plans_user_type ON daily_plans(user_id, type_id)",
    "CREATE INDEX IF NOT EXISTS idx_chapter_completions_user_chapter ON student_chapter_completions(user_id, raw_chapter_id, plan_stage)",
    "CREATE INDEX IF NOT EXISTS idx_chapter_templates_lookup ON chapter_summary_templates(math_type, raw_chapter_id, plan_stage)",
]


DEFAULT_TEST_ACCESS_CODES = [
    ("demo-a01", "10001", "claimed"),
    ("demo-b01", "10002", "claimed"),
    ("new-a01", "", "unused"),
    ("new-b01", "", "unused"),
]

DEFAULT_INTERNAL_TEST_ACCOUNT_HASHES = {
    "stu10001": "$sha256$f34c8e20dd7811ebb20b40fdbd51967fdc9e3e42239890d2a1f9de673c08b90d",
    "stu10002": "$sha256$df658e57e1ec27a6972a21fb0286e8f5eb38292822b375267dac4d85685c465c",
    "stu10003": "$sha256$76d9ceec0a63bb1b659143d8c669b99434fecc4d987dd0404dc2203b83b66623",
    "stu10004": "$sha256$c71eb5a3fc6f42ab953227b658a7973205b32d6bb18b43ba8bb080e1bbf157a0",
    "stu10005": "$sha256$4ba603478054c191828542dc51291dc6131645a2691ba899f60944dda007e1bd",
    "stu10006": "$sha256$dc7315e5c8cd223cbcd368a126d9045739ac3cd9f5dfdcc7338de111ab13a071",
    "stu10007": "$sha256$ae4c98219d84f89fbe4d588fe0fb31b36ce7f4531ee3035a717c449458f5fa60",
    "stu10008": "$sha256$d265ab25e908791074277fad311f9e2e1296fc458c25067b0a157870ad56a467",
    "stu10009": "$sha256$1e1a0439cc4eff0e1f1c9620d2c578545c0591684a7234b6454451cba3d149da",
    "stu10010": "$sha256$2b248a6e359d59517ffa4375b5b00ee874ff6c5686858725be4a7855cba766bd",
}

DEFAULT_INTERNAL_TEST_CLASS_ROTATION = [
    ("A201", "A", "45"),
    ("B201", "B", "60"),
    ("C201", "C", "60"),
    ("D201", "D", "75"),
]


def read_workbook(table_name: str) -> pd.DataFrame:
    path = SAMPLE_DATA_DIR / f"{table_name}.xlsx"
    if not path.exists():
        raise FileNotFoundError(f"Missing sample table: {path}")
    return pd.read_excel(path, dtype=str).fillna("")


def table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()}


def ensure_runtime_chapter_order_seed(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chapters (
          chapter_id TEXT PRIMARY KEY,
          math_type TEXT NOT NULL DEFAULT '',
          subject TEXT NOT NULL DEFAULT '',
          chapter_name TEXT NOT NULL DEFAULT '',
          chapter_alias TEXT NOT NULL DEFAULT '',
          is_active TEXT NOT NULL DEFAULT '1',
          source_pdf TEXT NOT NULL DEFAULT '',
          source_pdf_page TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT ''
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chapter_orders (
          plan_variant_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          chapter_sort TEXT NOT NULL DEFAULT '0',
          is_active TEXT NOT NULL DEFAULT '1',
          PRIMARY KEY (plan_variant_id, chapter_id)
        )
        """
    )
    chapter_rows = conn.execute(
        """
        SELECT
          chapter_id,
          MIN(sort_code) AS first_sort_code,
          COALESCE(NULLIF(MAX(chapter_name), ''), chapter_id) AS chapter_name,
          COALESCE(NULLIF(MAX(subject), ''), '') AS subject
        FROM question_types
        WHERE chapter_id <> ''
        GROUP BY chapter_id
        ORDER BY MIN(sort_code), chapter_id
        """
    ).fetchall()
    for index, row in enumerate(chapter_rows, start=1):
        chapter_id = str(row["chapter_id"] or "")
        conn.execute(
            """
            INSERT OR REPLACE INTO chapters (
              chapter_id, math_type, subject, chapter_name, is_active
            ) VALUES (?, ?, ?, ?, '1')
            """,
            (chapter_id, "数学二", row["subject"] or "", row["chapter_name"] or chapter_id),
        )
        for plan_variant_id in ("math2_mixed", "math2_gaoshu_first"):
            conn.execute(
                """
                INSERT OR REPLACE INTO chapter_orders (
                  plan_variant_id, chapter_id, chapter_sort, is_active
                ) VALUES (?, ?, ?, '1')
                """,
                (plan_variant_id, chapter_id, str(index)),
            )


def upsert_by_key(conn: sqlite3.Connection, table_name: str, key_column: str, values: dict[str, str]) -> None:
    columns = table_columns(conn, table_name)
    filtered = {key: value for key, value in values.items() if key in columns}
    if key_column not in filtered:
        return
    existing = conn.execute(
        f"SELECT 1 FROM {table_name} WHERE {key_column} = ? LIMIT 1",
        (filtered[key_column],),
    ).fetchone()
    if existing:
        assignments = [column for column in filtered if column != key_column]
        if assignments:
            conn.execute(
                f"""
                UPDATE {table_name}
                SET {", ".join(f"{column} = ?" for column in assignments)}
                WHERE {key_column} = ?
                """,
                tuple(filtered[column] for column in assignments) + (filtered[key_column],),
            )
        return
    conn.execute(
        f"""
        INSERT INTO {table_name} ({", ".join(filtered)})
        VALUES ({", ".join("?" for _ in filtered)})
        """,
        tuple(filtered.values()),
    )


def ensure_default_internal_test_accounts(conn: sqlite3.Connection) -> None:
    created_at = "2026-06-10 06:00:00"
    avatars = [
        "/assets/images/avatars/user/B_kaoyan_avatar_01.webp",
        "/assets/images/avatars/user/B_kaoyan_avatar_03.webp",
        "/assets/images/avatars/user/B_kaoyan_avatar_05.webp",
        "/assets/images/avatars/user/B_kaoyan_avatar_07.webp",
    ]
    for index, (login_account, password_hash) in enumerate(DEFAULT_INTERNAL_TEST_ACCOUNT_HASHES.items(), start=1):
        user_id = login_account.replace("stu", "", 1)
        class_id, level, intensive_days = DEFAULT_INTERNAL_TEST_CLASS_ROTATION[(index - 1) % len(DEFAULT_INTERNAL_TEST_CLASS_ROTATION)]
        upsert_by_key(
            conn,
            "users",
            "user_id",
            {
                "user_id": user_id,
                "login_account": login_account,
                "password_hash": password_hash,
                "login_password": "",
                "role": "student",
                "nickname": f"测试号{index:02d}",
                "avatar_url": avatars[(index - 1) % len(avatars)],
                "QQ": f"90001{index:03d}",
                "account_status": "active",
                "current_session_id": "",
                "last_login_at": "",
                "created_at": created_at,
                "updated_at": now_text(),
                "gender": "",
                "password_changed_at": created_at,
                "account_type": "internal_test",
                "activated_at": created_at,
            },
        )
        upsert_by_key(
            conn,
            "student_profiles",
            "user_id",
            {
                "user_id": user_id,
                "math_type": "数学二",
                "target_exam_year": "2026",
                "target_exam_date": "2026-12-19",
                "target_score": "120",
                "class_id": class_id,
                "level": level,
                "plan_enabled": "1",
                "paid_until": "2026-12-31",
                "primary_book_1": "m2_880",
                "primary_book_2": "m2_1000",
                "backup_book": "m2_660",
                "current_type_id": "M2-QT-0001",
                "current_stage": "强化",
                "last_plan_date": "",
                "created_at": created_at,
                "updated_at": now_text(),
                "intensive_days": intensive_days,
                "review_order": "mixed",
                "plan_variant_id": "math2_mixed",
                "initial_start_chapter_id": "",
                "diagnostic_json": "",
                "primary_book_1_scope": "both",
                "primary_book_2_scope": "both",
                "target_school_id": "",
                "target_school_name": "",
            },
        )
        upsert_by_key(
            conn,
            "student_progress",
            "user_id",
            {
                "progress_id": f"PR-{user_id}",
                "user_id": user_id,
                "math_type": "数学二",
                "plan_stage": "强化",
                "current_type_id": "M2-QT-0001",
                "current_type_sort_code": "01-001",
                "progress_status": "active",
                "last_generated_plan_date": "",
                "last_completed_type_id": "",
                "unfinished_type_id": "",
                "unfinished_question_ids": "[]",
                "created_at": created_at,
                "updated_at": now_text(),
                "carryover_type_id": "",
                "carryover_question_ids": "[]",
                "current_type_status": "active",
            },
        )


def seed_database(db_path: Path = DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS test_runtime_state (
              state_key TEXT PRIMARY KEY,
              state_value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO test_runtime_state (state_key, state_value, updated_at)
            VALUES ('current_test_date', '2026-06-10', '2026-06-10 06:00:00')
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS announcements (
              announcement_id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              content TEXT NOT NULL DEFAULT '',
              audience TEXT NOT NULL DEFAULT 'activated_students',
              status TEXT NOT NULL DEFAULT 'published',
              image_url TEXT NOT NULL DEFAULT '',
              image_filename TEXT NOT NULL DEFAULT '',
              image_original_name TEXT NOT NULL DEFAULT '',
              image_content_type TEXT NOT NULL DEFAULT '',
              image_size_bytes TEXT NOT NULL DEFAULT '0',
              created_by TEXT NOT NULL DEFAULT 'adm001',
              published_at TEXT NOT NULL,
              hidden_at TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS announcement_reads (
              announcement_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              read_at TEXT NOT NULL,
              PRIMARY KEY (announcement_id, user_id)
            )
            """
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

        ensure_question_source_display_columns(conn)
        ensure_daily_plan_sequence_columns(conn)
        ensure_formal_activation_tables(conn)
        ensure_admin_console_tables(conn)
        ensure_growth_snapshot_tables(conn)
        ensure_study_room_tables(conn)
        ensure_student_progress_tracking_columns(conn)
        ensure_student_profile_target_school_columns(conn)
        ensure_runtime_chapter_order_seed(conn)
        conn.execute(
            """
            INSERT OR REPLACE INTO admin_totp_state (
              admin_user_id, formal_activations_since_totp, totp_secret,
              totp_bound_at, setup_token_hash, setup_token_expires_at,
              last_verified_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("adm001", "0", "", "", "", "", "", now_text()),
        )

        ensure_default_internal_test_accounts(conn)

        for statement in INDEXES:
            conn.execute(statement)

        conn.commit()


if __name__ == "__main__":
    seed_database()
    print(f"Seeded SQLite database: {DB_PATH}")
