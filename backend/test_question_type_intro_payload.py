import unittest

from backend import services


class QuestionTypeIntroPayloadTests(unittest.TestCase):
    def test_builds_summary_from_public_seed_intro_fields(self):
        payload = services.question_type_intro_payload(
            {
                "type_name": "知识点：函数极限概念辨析（注意复合函数极限）",
                "card_title": "题型1｜知识点：函数极限概念辨析（注意复合函数极限）",
                "importance_tag": "易错",
                "question_kind": "概念题",
                "intro_title": "复合极限辨析",
                "intro_body": "复合极限先看内层趋向、定义域和连续性条件。",
            }
        )

        self.assertEqual(payload["cardTitle"], "题型1｜知识点：函数极限概念辨析（注意复合函数极限）")
        self.assertEqual(payload["importanceTag"], "易错")
        self.assertEqual(payload["questionKind"], "概念题")
        self.assertEqual(payload["introTitle"], "复合极限辨析")
        self.assertEqual(payload["introBody"], "复合极限先看内层趋向、定义域和连续性条件。")
        self.assertEqual(
            payload["summary"],
            {
                "title": "易错｜概念题：复合极限辨析",
                "body": "复合极限先看内层趋向、定义域和连续性条件。",
            },
        )


if __name__ == "__main__":
    unittest.main()
