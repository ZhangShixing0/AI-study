import re
import unittest

from backend import services


class FakeCursor:
    def __init__(self, rows=None, row=None):
        self._rows = rows or []
        self._row = row

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._row


class RecordingConnection:
    def __init__(self, columns_by_table, template_row=None, completion_row=None):
        self.columns_by_table = columns_by_table
        self.template_row = template_row
        self.completion_row = completion_row
        self.calls = []

    def execute(self, sql, params=None):
        normalized = " ".join(str(sql).split())
        self.calls.append((normalized, params))
        pragma = re.search(r"PRAGMA table_info\(([^)]+)\)", normalized)
        if pragma:
            columns = self.columns_by_table.get(pragma.group(1), set())
            return FakeCursor(rows=[{"name": name} for name in columns])
        if "FROM student_chapter_completions c" in normalized:
            return FakeCursor(row=self.completion_row)
        if "FROM chapter_summary_templates" in normalized:
            return FakeCursor(row=self.template_row)
        return FakeCursor()


PUBLIC_TEMPLATE_COLUMNS = {
    "summary_template_id",
    "math_type",
    "chapter_id",
    "plan_stage",
    "summary_title",
    "exam_focus",
    "key_points",
    "common_mistakes",
    "review_suggestions",
    "is_active",
    "updated_at",
}


class ChapterSummaryPostgresCompatibilityTests(unittest.TestCase):
    def make_connection(self, **kwargs):
        return RecordingConnection(
            {
                "loss_reason_stats": {"trend_delta"},
                "chapter_summary_templates": PUBLIC_TEMPLATE_COLUMNS,
            },
            **kwargs,
        )

    def test_growth_migration_indexes_public_chapter_id(self):
        conn = self.make_connection()

        services.ensure_growth_snapshot_tables(conn)

        statements = "\n".join(sql for sql, _ in conn.calls)
        self.assertIn(
            "idx_chapter_templates_lookup ON chapter_summary_templates(math_type, chapter_id, plan_stage)",
            statements,
        )

    def test_summary_lookup_uses_public_chapter_id(self):
        conn = self.make_connection(template_row={"summary_template_id": "CST-001"})

        result = services.summary_template_for_chapter(conn, "M2-C01", "数学二", "强化")

        lookup_sql = next(
            sql for sql, _ in conn.calls
            if "FROM chapter_summary_templates" in sql
        )
        self.assertIn("WHERE chapter_id = ?", lookup_sql)
        self.assertEqual(result["summary_template_id"], "CST-001")

    def test_latest_summary_uses_exam_focus_without_removed_legacy_columns(self):
        conn = self.make_connection(
            completion_row={
                "raw_chapter_id": "M2-C01",
                "chapter_name": "极限",
                "summary_title": "极限总结",
                "exam_focus": "本章在真题中的考察",
                "key_points": "核心能力",
                "common_mistakes": "常见失分点",
                "review_suggestions": "复习建议",
                "accuracy_rate": "0.8",
                "spent_days": "3",
            }
        )

        result = services.latest_chapter_summary_for_plan(conn, "10001", "2026-06-28")

        lookup_sql = next(
            sql for sql, _ in conn.calls
            if "FROM student_chapter_completions c" in sql
        )
        self.assertIn("t.exam_focus", lookup_sql)
        self.assertNotIn("t.summary_text", lookup_sql)
        self.assertNotIn("t.next_step_text", lookup_sql)
        self.assertEqual(result["examFocus"], "本章在真题中的考察")


if __name__ == "__main__":
    unittest.main()
