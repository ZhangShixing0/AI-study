import sqlite3
import unittest

from backend import services


class QuestionTypeCardLabelTests(unittest.TestCase):
    def test_startup_migration_adds_card_type_label_column(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute("CREATE TABLE question_types (type_id TEXT PRIMARY KEY)")

        services.ensure_question_type_card_label_column(conn)

        columns = {
            row["name"]: dict(row)
            for row in conn.execute("PRAGMA table_info(question_types)").fetchall()
        }
        self.assertIn("card_type_label", columns)
        self.assertEqual(columns["card_type_label"]["notnull"], 0)
        self.assertIsNone(columns["card_type_label"]["dflt_value"])

    def test_intro_payload_returns_card_type_label_without_parsing_title(self):
        payload = services.question_type_intro_payload(
            {
                "type_name": "Limit concept",
                "card_type_label": "\u9898\u578b3",
                "card_title": "Sequence limits",
            }
        )

        self.assertEqual(payload["cardTypeLabel"], "\u9898\u578b3")
        self.assertEqual(payload["cardTitle"], "Sequence limits")


if __name__ == "__main__":
    unittest.main()
