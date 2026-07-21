from __future__ import annotations

import argparse
import sys

import httpx


def get_json(client: httpx.Client, path: str) -> dict:
    response = client.get(path)
    response.raise_for_status()
    return response.json()


def post_json(client: httpx.Client, path: str, payload: dict) -> dict:
    response = client.post(path, json=payload)
    response.raise_for_status()
    return response.json()


def assert_status(client: httpx.Client, path: str) -> dict:
    response = client.get(path)
    response.raise_for_status()
    return response.json()


def run(base_url: str, admin_user_id: str) -> None:
    with httpx.Client(base_url=base_url, timeout=20) as client:
        health = get_json(client, "/health")
        if health.get("status") != "ok":
            raise RuntimeError(f"health failed: {health}")

        registration = get_json(
            client,
            "/public/registration-options?mathType=%E6%95%B0%E5%AD%A6%E4%BA%8C",
        )
        if not registration.get("planVariants"):
            raise RuntimeError("registration options did not return plan variants")
        if len(registration.get("classIntake", [])) != 4:
            raise RuntimeError("registration options should expose 4 class intake rows")

        preview = get_json(
            client,
            f"/admin/formal-accounts/next-preview?adminUserId={admin_user_id}",
        )
        preview_id = preview["credential"]["previewId"]
        activated = post_json(
            client,
            "/admin/formal-accounts/activate-next",
            {
                "adminUserId": admin_user_id,
                "previewId": preview_id,
                "totpCode": "",
            },
        )
        if activated.get("requiresTotp"):
            raise RuntimeError("formal activation unexpectedly requires TOTP")

        login = post_json(
            client,
            "/auth/login",
            {
                "loginAccount": activated["activatedAccount"],
                "password": activated["credential"]["initialPassword"],
            },
        )
        user_id = login["user"]["userId"]
        onboarding = post_json(
            client,
            f"/students/{user_id}/onboarding",
            {
                "nickname": "测试生",
                "gender": "male",
                "qq": "123456789",
                "newPassword": "A1234567",
                "confirmPassword": "A1234567",
                "mathType": "数学二",
                "targetScore": 126,
                "foundationLevel": "基础较好",
                "primaryBooks": [
                    {"book": "880", "scope": "both"},
                    {"book": "1000", "scope": "advanced"},
                ],
                "backupBook": "660",
                "dailyStudyHours": 3,
                "intensiveDays": 45,
                "reviewOrder": "mixed",
                "diagnosticAnswers": [
                    {"questionId": "limit-equivalent-infinitesimal", "answer": "B"},
                    {"questionId": "derivative-absolute-value", "answer": "B"},
                ],
            },
        )
        plan_date = onboarding.get("user", {}).get("currentTestDate", "2026-06-10")

        plan = assert_status(client, f"/students/{user_id}/daily-plan?date={plan_date}")
        if not plan.get("plan", {}).get("types"):
            raise RuntimeError("daily plan response missing plan.types")

        study_room = assert_status(client, f"/students/{user_id}/study-room?date={plan_date}")
        room_id = study_room.get("studyRoom", {}).get("roomId", "")
        if not room_id.startswith("SR-M2-2026-"):
            raise RuntimeError(f"study room is not class-bound: {study_room}")

        profile = assert_status(client, f"/students/{user_id}/profile?date={plan_date}")
        if not profile.get("profile", {}).get("classId"):
            raise RuntimeError("profile response missing classId")

        curve = assert_status(client, f"/students/{user_id}/curve?date={plan_date}")
        if "weekly" not in curve.get("curve", {}):
            raise RuntimeError("curve response missing weekly metrics")

        rankings = assert_status(client, f"/students/{user_id}/rankings?date={plan_date}")
        if "rankings" not in rankings:
            raise RuntimeError("rankings response missing rankings root")

        assert_status(client, f"/students/{user_id}/notifications/status")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--admin-user-id", default="adm001")
    args = parser.parse_args()
    run(args.base_url, args.admin_user_id)
    print("v3.3 postgres smoke ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
