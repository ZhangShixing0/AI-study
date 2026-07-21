from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from backend.seed_db import TABLE_FILES, seed_database


class SeedDatabaseTablesTest(unittest.TestCase):
    def test_seed_table_file_list_has_no_duplicates(self) -> None:
        self.assertEqual(len(TABLE_FILES), len(set(TABLE_FILES)))

    def test_seed_database_imports_chapter_summary_tables(self) -> None:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
            db_path = Path(temp_dir) / "seed.sqlite"

            seed_database(db_path)

            conn = sqlite3.connect(db_path)
            try:
                table_names = {
                    row[0]
                    for row in conn.execute(
                        """
                        SELECT name
                        FROM sqlite_master
                        WHERE type = 'table'
                        """
                    ).fetchall()
                }
            finally:
                conn.close()

        self.assertTrue(
            {
                "student_chapter_completions",
                "chapter_summary_templates",
            }.issubset(table_names)
        )

    def test_seed_database_imports_student_chapter_completions(self) -> None:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
            db_path = Path(temp_dir) / "seed.sqlite"

            seed_database(db_path)

            conn = sqlite3.connect(db_path)
            try:
                row = conn.execute(
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'student_chapter_completions'
                    """
                ).fetchone()
            finally:
                conn.close()

        self.assertIsNotNone(row)


if __name__ == "__main__":
    unittest.main()
