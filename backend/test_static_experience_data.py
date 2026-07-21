import unittest

from fastapi.testclient import TestClient

from backend.main import app


class StaticExperienceDataTests(unittest.TestCase):
    def test_root_page_can_load_experience_data_file(self):
        client = TestClient(app)

        response = client.get("/data/experience-data.js")

        self.assertEqual(response.status_code, 200)
        self.assertIn("window.EXPERIENCE_DATA", response.text)


if __name__ == "__main__":
    unittest.main()
