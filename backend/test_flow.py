import warnings
import json
import sqlite3

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings(
    "ignore",
    message="Using `httpx` with `starlette.testclient` is deprecated.*",
)

from fastapi.testclient import TestClient

from backend.main import app
from backend.seed_db import seed_database
from backend.settings import DB_PATH


def fetch_one(query: str, params: tuple = {}) -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        return dict(conn.execute(query, params).fetchone())


def fetch_optional(query: str, params: tuple = {}) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(query, params).fetchone()
        return dict(row) if row else None


def main() -> None:
    seed_database()
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200, health.text

    existing_code_login = client.post("/auth/test-code", json={"code": "demo-a01"})
    assert existing_code_login.status_code == 200, existing_code_login.text
    existing_code_data = existing_code_login.json()
    assert existing_code_data["user"]["userId"] == "10001"
    assert existing_code_data["needsOnboarding"] is False

    unknown_code_login = client.post("/auth/test-code", json={"code": "not-issued"})
    assert unknown_code_login.status_code == 400, unknown_code_login.text

    new_code_login = client.post("/auth/test-code", json={"code": "new-a01"})
    assert new_code_login.status_code == 200, new_code_login.text
    new_code_data = new_code_login.json()
    new_user_id = new_code_data["user"]["userId"]
    assert int(new_user_id) > 10022
    assert new_code_data["needsOnboarding"] is True
    assert fetch_optional("SELECT * FROM users WHERE user_id = ?", (new_user_id,)) is not None
    assert fetch_optional("SELECT * FROM student_profiles WHERE user_id = ?", (new_user_id,)) is None
    claimed_code = fetch_one("SELECT user_id, status FROM test_access_codes WHERE code = ?", ("new-a01",))
    assert claimed_code["user_id"] == new_user_id
    assert claimed_code["status"] == "claimed"

    repeat_new_code_login = client.post("/auth/test-code", json={"code": "new-a01"})
    assert repeat_new_code_login.status_code == 200, repeat_new_code_login.text
    assert repeat_new_code_login.json()["user"]["userId"] == new_user_id
    assert repeat_new_code_login.json()["needsOnboarding"] is True

    onboarding = client.post(
        f"/students/{new_user_id}/onboarding",
        json={
            "targetScore": 135,
            "level": "C",
            "primaryBooks": ["880", "1000"],
            "backupBook": "660",
            "dailyTargetMinutes": 180,
        },
    )
    assert onboarding.status_code == 200, onboarding.text
    onboarding_data = onboarding.json()
    assert onboarding_data["user"]["userId"] == new_user_id
    assert onboarding_data["needsOnboarding"] is False
    new_profile = fetch_one(
        """
        SELECT target_score, level, primary_book_1, primary_book_2, backup_book, plan_enabled
        FROM student_profiles
        WHERE user_id = ?
        """,
        (new_user_id,),
    )
    assert new_profile["target_score"] == "135"
    assert new_profile["level"] == "C"
    assert new_profile["primary_book_1"] == "880"
    assert new_profile["primary_book_2"] == "1000"
    assert new_profile["backup_book"] == "660"
    assert new_profile["plan_enabled"] == "1"

    new_user_plan = client.get(f"/students/{new_user_id}/daily-plan", params={"date": "2026-06-11"})
    assert new_user_plan.status_code == 200, new_user_plan.text
    new_user_plan_data = new_user_plan.json()
    assert new_user_plan_data["student"]["targetScore"] == 135
    assert new_user_plan_data["plan"]["types"][0]["questions"]
    assert new_user_plan_data["plan"]["types"][0]["questions"][0]["label"].startswith("《")

    login = client.post(
        "/auth/login",
        json={"loginAccount": "stu10001", "password": "123456"},
    )
    assert login.status_code == 200, login.text
    login_data = login.json()
    user_id = login_data["user"]["userId"]

    login_by_user_id = client.post(
        "/auth/login",
        json={"loginAccount": "10001", "password": "123456"},
    )
    assert login_by_user_id.status_code == 200, login_by_user_id.text
    assert login_by_user_id.json()["user"]["userId"] == user_id

    expired_login = client.post(
        "/auth/login",
        json={"loginAccount": "stu10005", "password": "123456"},
    )
    assert expired_login.status_code == 200, expired_login.text
    expired_plan = client.get("/students/10005/daily-plan", params={"date": "2026-06-10"})
    assert expired_plan.status_code == 200, expired_plan.text
    assert expired_plan.json()["plan"]["planStatus"] == "expired"

    disabled_login = client.post(
        "/auth/login",
        json={"loginAccount": "stu10009", "password": "123456"},
    )
    assert disabled_login.status_code == 400, disabled_login.text

    paused_login = client.post(
        "/auth/login",
        json={"loginAccount": "stu10003", "password": "123456"},
    )
    assert paused_login.status_code == 400, paused_login.text

    generated_user_id = "10010"
    generated_plan = client.get(f"/students/{generated_user_id}/daily-plan", params={"date": "2026-06-11"})
    assert generated_plan.status_code == 200, generated_plan.text
    generated_plan_data = generated_plan.json()
    assert generated_plan_data["plan"]["planStatus"] == "in_progress"
    assert len(generated_plan_data["plan"]["types"]) >= 1
    assert generated_plan_data["plan"]["types"][0]["typeId"] == "G-01-Z-01"
    generated_snapshot = fetch_one(
        "SELECT COUNT(*) AS row_count FROM daily_plans WHERE user_id = ? AND plan_date = ?",
        (generated_user_id, "2026-06-11"),
    )
    assert generated_snapshot["row_count"] > 0

    plan = client.get(f"/students/{user_id}/daily-plan", params={"date": "2026-06-10"})
    assert plan.status_code == 200, plan.text
    plan_data = plan.json()
    open_type = next(
        item for item in plan_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )

    answers = [
        {
            "questionId": item["questionId"],
            "result": "correct" if index % 2 == 0 else "wrong",
            "wrongReason": None if index % 2 == 0 else "method_error",
        }
        for index, item in enumerate(open_type["questions"])
    ]
    missing_reason_answers = [
        {
            "questionId": item["questionId"],
            "result": "correct" if index % 2 == 0 else "wrong",
        }
        for index, item in enumerate(open_type["questions"])
    ]
    missing_reason_submit = client.post(
        "/feedback/submit",
        json={
            "userId": user_id,
            "planDate": plan_data["plan"]["planDate"],
            "typeId": open_type["typeId"],
            "answers": missing_reason_answers,
        },
    )
    assert missing_reason_submit.status_code == 400, missing_reason_submit.text
    submit = client.post(
        "/feedback/submit",
        json={
            "userId": user_id,
            "planDate": plan_data["plan"]["planDate"],
            "typeId": open_type["typeId"],
            "answers": answers,
        },
    )
    assert submit.status_code == 200, submit.text
    submit_data = submit.json()
    wrong_reason_count = fetch_one(
        """
        SELECT COUNT(*) AS row_count
        FROM question_feedbacks
        WHERE user_id = ? AND plan_date = ? AND type_id = ?
          AND result = 'wrong' AND wrong_reason_code = 'method_error'
        """,
        (user_id, plan_data["plan"]["planDate"], open_type["typeId"]),
    )
    assert wrong_reason_count["row_count"] == sum(1 for item in answers if item["result"] == "wrong")
    feedback_count = fetch_one(
        """
        SELECT COUNT(*) AS row_count
        FROM question_feedbacks
        WHERE user_id = ? AND plan_date = ? AND type_id = ?
        """,
        (user_id, plan_data["plan"]["planDate"], open_type["typeId"]),
    )
    assert feedback_count["row_count"] == len(answers)

    submitted_plan_rows = fetch_one(
        """
        SELECT
          SUM(CASE WHEN feedback_open_status = 'submitted' THEN 1 ELSE 0 END) AS submitted_rows,
          COUNT(*) AS total_rows
        FROM daily_plans
        WHERE user_id = ? AND plan_date = ? AND type_id = ?
        """,
        (user_id, plan_data["plan"]["planDate"], open_type["typeId"]),
    )
    assert submitted_plan_rows["submitted_rows"] == submitted_plan_rows["total_rows"]

    progress_after_submit = fetch_one(
        """
        SELECT current_type_id, last_completed_type_id, unfinished_type_id, unfinished_question_ids
        FROM student_progress
        WHERE user_id = ?
        """,
        (user_id,),
    )
    assert progress_after_submit["last_completed_type_id"] == open_type["typeId"]
    assert progress_after_submit["unfinished_type_id"] == ""
    assert progress_after_submit["unfinished_question_ids"] == "[]"

    other_test_user_login = client.post("/auth/test-code", json={"code": "demo-b01"})
    assert other_test_user_login.status_code == 200, other_test_user_login.text
    assert other_test_user_login.json()["user"]["currentTestDate"] == "2026-06-10"

    advanced_day = client.post(f"/students/{user_id}/test-day/advance")
    assert advanced_day.status_code == 200, advanced_day.text
    advanced_day_data = advanced_day.json()
    assert advanced_day_data["currentTestDate"] == "2026-06-11"
    assert advanced_day_data["dailyPlan"]["plan"]["planDate"] == "2026-06-11"
    assert advanced_day_data["dailyPlan"]["plan"]["types"][0]["typeId"] == progress_after_submit["current_type_id"]
    assert advanced_day_data["dailyPlan"]["plan"]["types"][0]["typeId"] != open_type["typeId"]

    assert fetch_one(
        "SELECT current_test_date FROM test_user_dates WHERE user_id = ?",
        (user_id,),
    )["current_test_date"] == "2026-06-11"
    assert fetch_one(
        "SELECT current_test_date FROM test_user_dates WHERE user_id = ?",
        ("10002",),
    )["current_test_date"] == "2026-06-10"
    assert fetch_one(
        "SELECT COUNT(*) AS row_count FROM student_stats WHERE user_id = ? AND stat_date = ?",
        (user_id, "2026-06-11"),
    )["row_count"] == 1
    assert fetch_one(
        "SELECT COUNT(*) AS row_count FROM student_daily_activity WHERE user_id = ? AND activity_date = ?",
        (user_id, "2026-06-11"),
    )["row_count"] == 1
    assert fetch_one(
        "SELECT COUNT(*) AS row_count FROM student_study_goals WHERE user_id = ? AND study_date = ?",
        (user_id, "2026-06-11"),
    )["row_count"] == 1

    stats_after_submit = fetch_one(
        """
        SELECT today_completion_rate, overall_accuracy
        FROM student_stats
        WHERE user_id = ? AND stat_date = ?
        """,
        (user_id, plan_data["plan"]["planDate"]),
    )
    assert stats_after_submit["today_completion_rate"] == "0.5000"
    assert float(stats_after_submit["overall_accuracy"]) == submit_data["accuracy"]

    refreshed = client.get(f"/students/{user_id}/daily-plan", params={"date": "2026-06-10"})
    assert refreshed.status_code == 200, refreshed.text
    refreshed_data = refreshed.json()

    submitted_type = next(
        item for item in refreshed_data["plan"]["types"] if item["typeId"] == open_type["typeId"]
    )
    assert submitted_type["feedbackOpenStatus"] == "submitted"
    assert len(refreshed_data["plan"]["feedbacks"]) == len(answers)

    next_open_type = next(
        item for item in refreshed_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )
    completion_answers = [
        {"questionId": item["questionId"], "result": "correct"}
        for item in next_open_type["questions"]
    ]
    completion_submit = client.post(
        "/feedback/submit",
        json={
            "userId": user_id,
            "planDate": refreshed_data["plan"]["planDate"],
            "typeId": next_open_type["typeId"],
            "answers": completion_answers,
        },
    )
    assert completion_submit.status_code == 200, completion_submit.text
    completion_data = completion_submit.json()
    assert completion_data["planStatus"] == "completed"
    assert completion_data["dailyPlan"]["plan"]["planStatus"] == "completed"
    assert "恭喜你完成今日全部题型" in completion_data["dailyPlan"]["plan"]["completedMessage"]

    completed_stats = fetch_one(
        """
        SELECT today_completion_rate, today_checkin_order, today_checkin_at
        FROM student_stats
        WHERE user_id = ? AND stat_date = ?
        """,
        (user_id, refreshed_data["plan"]["planDate"]),
    )
    assert completed_stats["today_completion_rate"] == "1.0000"
    assert completed_stats["today_checkin_order"] != ""
    assert completed_stats["today_checkin_at"] != ""

    rankings = client.get(f"/students/{user_id}/rankings", params={"date": "2026-06-10"})
    assert rankings.status_code == 200, rankings.text
    rankings_data = rankings.json()
    assert rankings_data["student"]["classId"] == "A201"
    assert set(rankings_data["boards"].keys()) == {"today", "weekly", "streak"}
    assert rankings_data["boards"]["today"]["rows"]
    assert rankings_data["boards"]["today"]["myRank"] >= 10
    assert any(row.get("isDivider") for row in rankings_data["boards"]["today"]["rows"])

    curve = client.get(f"/students/{user_id}/curve", params={"date": "2026-06-10"})
    assert curve.status_code == 200, curve.text
    curve_data = curve.json()
    assert curve_data["student"]["userId"] == user_id
    assert curve_data["curve"]["title"] == "数学能力成长曲线"
    assert len(curve_data["curve"]["activity"]) == 14
    assert curve_data["curve"]["activity"][0]["rawDate"] == "2026-05-27"
    assert curve_data["curve"]["activity"][-1]["rawDate"] == "2026-06-09"
    assert all(row["rawDate"] != "2026-06-10" for row in curve_data["curve"]["activity"])
    assert curve_data["curve"]["activitySummary"]["totalHours"] == 24.6
    assert curve_data["curve"]["activitySummary"]["maxHours"] == 2.9
    assert curve_data["curve"]["activitySummary"]["continuousDays"] == 6
    assert curve_data["curve"]["masteryLabel"] == "章节掌握度"
    assert len(curve_data["curve"]["mastery"]) == 15
    assert curve_data["curve"]["mastery"][0]["name"] == "第一章 极限"
    assert curve_data["curve"]["mastery"][-1]["name"] == "线代第六章 二次型"
    assert "线代第一章 行列式" in [row["name"] for row in curve_data["curve"]["mastery"]]
    assert any(row["rate"] == 0 for row in curve_data["curve"]["mastery"])
    loss_names = [row["name"] for row in curve_data["curve"]["lossReasons"]]
    assert "知识点不熟、概念混淆" in loss_names
    assert "条件、范围、边界漏考虑" in loss_names
    assert curve_data["curve"]["priorities"][0]["rate"] == 0

    alternate_curve = client.get("/students/10016/curve", params={"date": "2026-06-10"})
    assert alternate_curve.status_code == 200, alternate_curve.text
    alternate_curve_data = alternate_curve.json()
    assert alternate_curve_data["student"]["userId"] == "10016"
    assert alternate_curve_data["curve"]["mastery"] != curve_data["curve"]["mastery"]
    assert alternate_curve_data["curve"]["lossReasons"][0]["name"] != curve_data["curve"]["lossReasons"][0]["name"]
    assert alternate_curve_data["curve"]["priorities"][0]["name"] != curve_data["curve"]["priorities"][0]["name"]

    zero_loss_curve = client.get("/students/10018/curve", params={"date": "2026-06-10"})
    assert zero_loss_curve.status_code == 200, zero_loss_curve.text
    assert [row["rate"] for row in zero_loss_curve.json()["curve"]["lossReasons"]] == [0, 0, 0, 0]

    sparse_loss_curve = client.get("/students/10019/curve", params={"date": "2026-06-10"})
    assert sparse_loss_curve.status_code == 200, sparse_loss_curve.text
    assert [row["rate"] for row in sparse_loss_curve.json()["curve"]["lossReasons"]].count(0) == 3

    study_room = client.get(f"/students/{user_id}/study-room", params={"date": "2026-06-10"})
    assert study_room.status_code == 200, study_room.text
    study_room_data = study_room.json()
    assert study_room_data["studyRoom"]["roomName"] == "数学二冲刺自习室"
    assert study_room_data["studyRoom"]["targetMinutes"] == 180
    assert study_room_data["studyRoom"]["completedMinutes"] == 90
    assert len(study_room_data["studyRoom"]["taskOptions"]) == len(refreshed_data["plan"]["types"])
    assert study_room_data["studyRoom"]["taskOptions"][0]["typeId"] == refreshed_data["plan"]["types"][0]["typeId"]
    assert study_room_data["studyRoom"]["members"][0]["focusedMinutes"] >= study_room_data["studyRoom"]["members"][-1]["focusedMinutes"]

    start_focus = client.post(
        "/focus-sessions/start",
        json={
            "userId": user_id,
            "planDate": "2026-06-10",
            "taskTypeId": study_room_data["studyRoom"]["taskOptions"][0]["typeId"],
            "targetMinutes": 45,
        },
    )
    assert start_focus.status_code == 200, start_focus.text
    session_id = start_focus.json()["session"]["sessionId"]

    pause_focus = client.post(f"/focus-sessions/{session_id}/pause")
    assert pause_focus.status_code == 200, pause_focus.text
    assert pause_focus.json()["session"]["status"] == "paused"

    resume_focus = client.post(f"/focus-sessions/{session_id}/resume")
    assert resume_focus.status_code == 200, resume_focus.text
    assert resume_focus.json()["session"]["status"] == "running"

    finish_focus = client.post(
        f"/focus-sessions/{session_id}/finish",
        json={"focusedSeconds": 125},
    )
    assert finish_focus.status_code == 200, finish_focus.text
    finish_data = finish_focus.json()
    assert finish_data["session"]["status"] == "completed"
    assert finish_data["session"]["countedMinutes"] == 2
    assert finish_data["studyRoom"]["completedMinutes"] == 92
    saved_session = fetch_one(
        "SELECT status, focused_seconds, counted_minutes FROM focus_sessions WHERE session_id = ?",
        (session_id,),
    )
    assert saved_session["status"] == "completed"
    assert saved_session["focused_seconds"] == "125"
    assert saved_session["counted_minutes"] == "2"

    profile = client.get(f"/students/{user_id}/profile", params={"date": "2026-06-10"})
    assert profile.status_code == 200, profile.text
    profile_data = profile.json()
    assert profile_data["profile"]["nickname"] == login_data["user"]["nickname"]
    assert profile_data["profile"]["targetSchool"]["name"] == "未选择"
    assert profile_data["profile"]["examSubject"] == "数学二"
    assert profile_data["profile"]["dailyMathGoalHours"] == 3.0
    assert profile_data["profile"]["todayStudyHours"] == 1.5
    assert profile_data["profile"]["daysToExam"] == 192

    school_search = client.get("/institutions/search", params={"q": "清华"})
    assert school_search.status_code == 200, school_search.text
    assert any(item["name"] == "清华大学" for item in school_search.json()["items"])

    update_school = client.post(
        f"/students/{user_id}/target-school",
        json={"schoolId": "SCH-10003"},
    )
    assert update_school.status_code == 200, update_school.text
    assert update_school.json()["profile"]["targetSchool"]["name"] == "清华大学"
    saved_school = fetch_one(
        "SELECT target_school_id, target_school_name FROM student_profiles WHERE user_id = ?",
        (user_id,),
    )
    assert saved_school["target_school_id"] == "SCH-10003"
    assert saved_school["target_school_name"] == "清华大学"

    unfinished_user_id = "10002"
    unfinished_plan = client.get(f"/students/{unfinished_user_id}/daily-plan", params={"date": "2026-06-10"})
    assert unfinished_plan.status_code == 200, unfinished_plan.text
    unfinished_plan_data = unfinished_plan.json()
    unfinished_open_type = next(
        item for item in unfinished_plan_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )
    unfinished_answers = [
        {"questionId": item["questionId"], "result": "unattempted"}
        for item in unfinished_open_type["questions"]
    ]

    missing_unattempted_action = client.post(
        "/feedback/submit",
        json={
            "userId": unfinished_user_id,
            "planDate": unfinished_plan_data["plan"]["planDate"],
            "typeId": unfinished_open_type["typeId"],
            "answers": unfinished_answers,
        },
    )
    assert missing_unattempted_action.status_code == 400, missing_unattempted_action.text

    unfinished_submit = client.post(
        "/feedback/submit",
        json={
            "userId": unfinished_user_id,
            "planDate": unfinished_plan_data["plan"]["planDate"],
            "typeId": unfinished_open_type["typeId"],
            "answers": unfinished_answers,
            "unattemptedAction": "defer",
        },
    )
    assert unfinished_submit.status_code == 200, unfinished_submit.text
    unfinished_submit_data = unfinished_submit.json()
    assert unfinished_submit_data["planStatus"] == "blocked_by_unfinished"
    assert unfinished_submit_data["hasUnattempted"] is True
    assert unfinished_submit_data["unattemptedAction"] == "defer"

    unfinished_progress = fetch_one(
        """
        SELECT current_type_id, current_type_status, unfinished_type_id, unfinished_question_ids
        FROM student_progress
        WHERE user_id = ?
        """,
        (unfinished_user_id,),
    )
    assert unfinished_progress["current_type_id"] == unfinished_open_type["typeId"]
    assert unfinished_progress["current_type_status"] == "unfinished"
    assert unfinished_progress["unfinished_type_id"] == unfinished_open_type["typeId"]
    assert set(json.loads(unfinished_progress["unfinished_question_ids"])) == {
        item["questionId"] for item in unfinished_open_type["questions"]
    }

    blocked_rows = fetch_one(
        """
        SELECT
          SUM(CASE WHEN feedback_open_status = 'open' THEN 1 ELSE 0 END) AS open_rows,
          SUM(CASE WHEN plan_status = 'blocked_by_unfinished' THEN 1 ELSE 0 END) AS blocked_rows,
          COUNT(*) AS total_rows
        FROM daily_plans
        WHERE user_id = ? AND plan_date = ?
        """,
        (unfinished_user_id, unfinished_plan_data["plan"]["planDate"]),
    )
    assert blocked_rows["open_rows"] == 0
    assert blocked_rows["blocked_rows"] == blocked_rows["total_rows"]

    unfinished_next_day = client.get(f"/students/{unfinished_user_id}/daily-plan", params={"date": "2026-06-11"})
    assert unfinished_next_day.status_code == 200, unfinished_next_day.text
    unfinished_next_day_data = unfinished_next_day.json()
    continued_type = unfinished_next_day_data["plan"]["types"][0]
    assert continued_type["typeId"] == unfinished_open_type["typeId"]
    assert {item["questionId"] for item in continued_type["questions"]} == {
        item["questionId"] for item in unfinished_open_type["questions"]
    }

    skip_user_id = "10010"
    skip_plan = client.get(f"/students/{skip_user_id}/daily-plan", params={"date": "2026-06-11"})
    assert skip_plan.status_code == 200, skip_plan.text
    skip_plan_data = skip_plan.json()
    skip_open_type = next(
        item for item in skip_plan_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )
    skip_answers = [
        {"questionId": item["questionId"], "result": "unattempted"}
        for item in skip_open_type["questions"]
    ]
    skip_submit = client.post(
        "/feedback/submit",
        json={
            "userId": skip_user_id,
            "planDate": skip_plan_data["plan"]["planDate"],
            "typeId": skip_open_type["typeId"],
            "answers": skip_answers,
            "unattemptedAction": "skip",
        },
    )
    assert skip_submit.status_code == 200, skip_submit.text
    skip_submit_data = skip_submit.json()
    assert skip_submit_data["planStatus"] in {"in_progress", "completed"}
    assert skip_submit_data["hasUnattempted"] is True
    assert skip_submit_data["unattemptedAction"] == "skip"

    skipped_progress = fetch_one(
        """
        SELECT current_type_id, current_type_status, last_completed_type_id,
               unfinished_type_id, unfinished_question_ids
        FROM student_progress
        WHERE user_id = ?
        """,
        (skip_user_id,),
    )
    assert skipped_progress["current_type_status"] == "active"
    assert skipped_progress["last_completed_type_id"] == skip_open_type["typeId"]
    assert skipped_progress["unfinished_type_id"] == ""
    assert skipped_progress["unfinished_question_ids"] == "[]"

    print(
        {
            "loginUser": login_data["user"]["nickname"],
            "submittedType": open_type["typeName"],
            "accuracy": submit_data["accuracy"],
            "newPlanStatus": submit_data["planStatus"],
            "feedbackRows": len(refreshed_data["plan"]["feedbacks"]),
            "unfinishedStatus": unfinished_submit_data["planStatus"],
        }
    )


if __name__ == "__main__":
    main()
