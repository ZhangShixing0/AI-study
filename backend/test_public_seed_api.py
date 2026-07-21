from __future__ import annotations

import os
import sqlite3
import tempfile
import unittest
import warnings
from pathlib import Path
from unittest.mock import patch

warnings.filterwarnings(
    "ignore",
    message="Using `httpx` with `starlette.testclient` is deprecated.*",
)

from fastapi.testclient import TestClient

from backend.main import app
from backend import public_seed


def create_public_seed_db(path: Path) -> None:
    with sqlite3.connect(path) as conn:
        conn.executescript(
            """
            CREATE TABLE plan_variants (
              plan_variant_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL,
              review_order TEXT NOT NULL,
              variant_name TEXT NOT NULL,
              student_label TEXT NOT NULL,
              description TEXT,
              is_active TEXT NOT NULL,
              version TEXT NOT NULL,
              sort_order TEXT NOT NULL,
              note TEXT
            );
            CREATE TABLE exercise_books (
              book_id TEXT PRIMARY KEY,
              book_name TEXT NOT NULL,
              book_type TEXT NOT NULL,
              math_type TEXT,
              plan_stage TEXT,
              is_registration_selectable TEXT NOT NULL,
              is_active TEXT NOT NULL,
              sort_order TEXT NOT NULL,
              note TEXT
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
              capacity TEXT,
              is_accepting_new_students TEXT NOT NULL,
              is_test_class TEXT NOT NULL,
              note TEXT
            );
            CREATE TABLE class_intake_settings (
              setting_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL,
              level TEXT NOT NULL,
              active_class_id TEXT NOT NULL,
              is_active TEXT NOT NULL,
              note TEXT
            );
            CREATE TABLE student_profiles (
              user_id TEXT PRIMARY KEY,
              math_type TEXT NOT NULL,
              level TEXT NOT NULL,
              class_id TEXT NOT NULL
            );
            CREATE TABLE institutions (
              school_id TEXT PRIMARY KEY,
              school_name TEXT NOT NULL,
              school_tags TEXT NOT NULL,
              province TEXT NOT NULL,
              search_keywords TEXT NOT NULL,
              sort_order TEXT NOT NULL
            );
            """
        )
        conn.executemany(
            """
            INSERT INTO plan_variants (
              plan_variant_id, math_type, review_order, variant_name, student_label,
              description, is_active, version, sort_order, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("math2_mixed", "数学二", "mixed", "数二高数线代穿插版", "高数线代穿插学习", "穿插推进", "1", "2026-v1", "1", ""),
                ("math2_gaoshu_first", "数学二", "gaoshu_first", "数二先高数后线代版", "先高数后线代", "先高数", "1", "2026-v1", "2", ""),
                ("math1_mixed", "数学一", "mixed", "数一穿插版", "数一穿插", "", "1", "2026-v1", "3", ""),
                ("math2_inactive", "数学二", "inactive", "停用方案", "停用", "", "0", "2026-v1", "9", ""),
            ],
        )
        conn.executemany(
            """
            INSERT INTO exercise_books (
              book_id, book_name, book_type, math_type, plan_stage,
              is_registration_selectable, is_active, sort_order, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("m2_880", "880题", "主选", "数学二", "强化", "1", "1", "1", ""),
                ("m2_1000", "1000题", "主选", "数学二", "强化", "1", "1", "2", ""),
                ("m2_yanxuan", "严选题", "题源", "数学二", "强化", "0", "1", "3", ""),
                ("m1_880", "880题", "主选", "数学一", "强化", "1", "1", "4", ""),
            ],
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
                ("A201", "数学二A班", "数学二", "2027", "A", "t001", "A班QQ群", "746056792", "300", "1", "0", ""),
                ("A202", "数学二A02班", "数学二", "2027", "A", "t001", "A02班QQ群", "746056793", "2", "1", "0", ""),
                ("B201", "数学二B班", "数学二", "2027", "B", "t001", "B班QQ群", "391408226", "300", "1", "0", ""),
                ("A101", "数学一A班", "数学一", "2027", "A", "t001", "A班QQ群", "100000001", "300", "1", "0", ""),
            ],
        )
        conn.executemany(
            """
            INSERT INTO class_intake_settings (
              setting_id, math_type, level, active_class_id, is_active, note
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("math2_A_current", "数学二", "A", "A201", "1", ""),
                ("math2_B_current", "数学二", "B", "B201", "1", ""),
                ("math1_A_current", "数学一", "A", "A101", "1", ""),
                ("math2_A_old", "数学二", "A", "A299", "0", ""),
            ],
        )
        conn.executemany(
            """
            INSERT INTO institutions (
              school_id, school_name, school_tags, province, search_keywords, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("SCH-10003", "清华大学", "985,211,双一流", "北京", "清华大学 清华 THU 北京", "3"),
                ("SCH-20001", "杭州电子科技大学", "一本,非双一流", "浙江", "杭州电子科技大学 杭电 HDU 浙江", "20001"),
            ],
        )
        conn.commit()


class PublicSeedApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "public-seed.sqlite"
        create_public_seed_db(self.db_path)
        self.env_patch = patch.dict(os.environ, {"PUBLIC_SEED_SQLITE_PATH": str(self.db_path)})
        self.env_patch.start()
        public_seed.reset_public_seed_reader()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        public_seed.reset_public_seed_reader()
        self.env_patch.stop()
        self.temp_dir.cleanup()

    def test_registration_options_are_read_from_public_seed_tables(self) -> None:
        response = self.client.get("/public/registration-options", params={"mathType": "数学二"})

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["mathType"], "数学二")
        self.assertEqual([item["reviewOrder"] for item in data["planVariants"]], ["mixed", "gaoshu_first"])
        self.assertEqual(data["planVariants"][0]["planVariantId"], "math2_mixed")
        self.assertEqual([item["bookId"] for item in data["exerciseBooks"]], ["m2_880", "m2_1000"])
        self.assertEqual(data["exerciseBooks"][0]["legacyCode"], "880")
        self.assertEqual([item["level"] for item in data["classIntake"]], ["A", "B"])
        self.assertEqual(data["classIntake"][0]["activeClassId"], "A201")
        self.assertEqual(data["classIntake"][0]["qqGroupNumber"], "746056792")
        self.assertEqual(data["defaults"]["reviewOrder"], "mixed")

    def test_active_class_resolver_skips_full_class_and_uses_next_open_class(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE classes SET capacity = ? WHERE class_id = ?", ("1", "A201"))
            conn.execute(
                "INSERT INTO student_profiles (user_id, math_type, level, class_id) VALUES (?, ?, ?, ?)",
                ("stu-full-a201", "数学二", "A", "A201"),
            )
            conn.commit()

        self.assertEqual(public_seed.resolve_active_class_id("数学二", "A"), "A202")

    def test_plan_variant_resolver_uses_active_plan_variant(self) -> None:
        self.assertEqual(public_seed.resolve_plan_variant_id("数学二", "mixed"), "math2_mixed")
        self.assertEqual(public_seed.resolve_plan_variant_id("数学二", "gaoshu_first"), "math2_gaoshu_first")

    def test_institution_search_uses_public_seed_when_configured(self) -> None:
        response = self.client.get("/institutions/search", params={"q": "杭电", "limit": 5})

        self.assertEqual(response.status_code, 200, response.text)
        item = response.json()["items"][0]
        self.assertEqual(item["schoolId"], "SCH-20001")
        self.assertEqual(item["name"], "杭州电子科技大学")
        self.assertEqual(item["tags"], ["一本", "非双一流"])
        self.assertEqual(item["province"], "浙江")


if __name__ == "__main__":
    unittest.main()
