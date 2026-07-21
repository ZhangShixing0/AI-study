import warnings
import json
import sqlite3

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings(
    "ignore",
    message="Using `httpx` with `starlette.testclient` is deprecated.*",
)

from fastapi.testclient import TestClient

from backend import services
from backend.main import app
from backend.seed_db import seed_database
from backend.settings import CURRENT_DATE, DB_PATH


def fetch_one(query: str, params: tuple = {}) -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        return dict(conn.execute(query, params).fetchone())


def fetch_optional(query: str, params: tuple = {}) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(query, params).fetchone()
        return dict(row) if row else None


def fetch_all(query: str, params: tuple = {}) -> list[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        return [dict(row) for row in conn.execute(query, params).fetchall()]


def execute_sql(query: str, params: tuple = {}) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(query, params)
        conn.commit()


def insert_row(table_name: str, values: dict) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        columns = [
            row[1]
            for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
            if row[1] in values
        ]
        placeholders = ", ".join("?" for _ in columns)
        column_clause = ", ".join(columns)
        conn.execute(
            f"INSERT INTO {table_name} ({column_clause}) VALUES ({placeholders})",
            [values[column] for column in columns],
        )
        conn.commit()


def mastery_by_chapter(curve_data: dict, chapter_id: str) -> dict:
    return next(
        (row for row in curve_data["curve"]["mastery"] if row["chapterId"] == chapter_id),
        {},
    )


def loss_reason_by_code(curve_data: dict, reason_code: str) -> dict:
    return next(
        (row for row in curve_data["curve"]["lossReasons"] if row["code"] == reason_code),
        {},
    )


def main() -> None:
    seed_database()
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200, health.text

    with sqlite3.connect(DB_PATH) as conn:
        table_names = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
    assert "formal_account_previews" in table_names
    assert "admin_totp_state" in table_names

    preview = client.get("/admin/formal-accounts/next-preview", params={"adminUserId": "adm001"})
    assert preview.status_code == 200, preview.text
    preview_data = preview.json()
    assert preview_data["credential"]["loginAccount"] == "stu60001"
    assert len(preview_data["credential"]["initialPassword"]) == 8
    assert preview_data["credential"]["initialPassword"].startswith("S60001")

    repeat_preview = client.get("/admin/formal-accounts/next-preview", params={"adminUserId": "adm001"})
    assert repeat_preview.status_code == 200, repeat_preview.text
    assert repeat_preview.json()["credential"] == preview_data["credential"]

    refresh_preview = client.post(
        "/admin/formal-accounts/next-preview/refresh",
        json={"adminUserId": "adm001", "previewId": preview_data["credential"]["previewId"]},
    )
    assert refresh_preview.status_code == 200, refresh_preview.text
    refreshed_credential = refresh_preview.json()["credential"]
    assert refreshed_credential["loginAccount"] == "stu60001"
    assert refreshed_credential["initialPassword"] != preview_data["credential"]["initialPassword"]

    activate = client.post(
        "/admin/formal-accounts/activate-next",
        json={"adminUserId": "adm001", "previewId": refreshed_credential["previewId"]},
    )
    assert activate.status_code == 200, activate.text
    activated = activate.json()
    assert activated["requiresTotp"] is False
    assert activated["activatedAccount"] == "stu60001"
    assert activated["credential"]["loginAccount"] == "stu60001"
    assert activated["credential"]["initialPassword"] == refreshed_credential["initialPassword"]
    assert activated["nextFormalAccount"] == "stu60002"

    pending_formal_before = client.get(
        "/admin/formal-accounts/pending-onboarding",
        params={"adminUserId": "adm001"},
    )
    assert pending_formal_before.status_code == 200, pending_formal_before.text
    pending_formal_before_items = pending_formal_before.json()["items"]
    pending_stu60001 = next(
        item for item in pending_formal_before_items if item["loginAccount"] == "stu60001"
    )
    assert pending_stu60001["initialPassword"] == activated["credential"]["initialPassword"]
    assert pending_stu60001["needsOnboarding"] is True

    formal_login = client.post(
        "/auth/login",
        json={
            "loginAccount": "stu60001",
            "password": activated["credential"]["initialPassword"],
        },
    )
    assert formal_login.status_code == 200, formal_login.text
    formal_login_data = formal_login.json()
    assert formal_login_data["needsOnboarding"] is True
    formal_user_id = formal_login_data["user"]["userId"]

    formal_onboarding = client.post(
        f"/students/{formal_user_id}/onboarding",
        json={
            "nickname": "林同学",
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
    assert formal_onboarding.status_code == 200, formal_onboarding.text
    formal_onboarding_data = formal_onboarding.json()
    assert formal_onboarding_data["needsOnboarding"] is False
    assert formal_onboarding_data["assignedLevel"] == "A"
    assert formal_onboarding_data["user"]["currentTestDate"] == CURRENT_DATE
    formal_plan_date = formal_onboarding_data["user"]["currentTestDate"]

    pending_formal_after = client.get(
        "/admin/formal-accounts/pending-onboarding",
        params={"adminUserId": "adm001"},
    )
    assert pending_formal_after.status_code == 200, pending_formal_after.text
    assert all(item["loginAccount"] != "stu60001" for item in pending_formal_after.json()["items"])

    onboarding_load_checks = [
        (f"/students/{formal_user_id}/daily-plan", {"date": formal_plan_date}),
        (f"/students/{formal_user_id}/rankings", {"date": formal_plan_date}),
        (f"/students/{formal_user_id}/curve", {"date": formal_plan_date}),
        (f"/students/{formal_user_id}/study-room", {"date": formal_plan_date}),
        (f"/students/{formal_user_id}/profile", {"date": formal_plan_date}),
        (f"/students/{formal_user_id}/notifications/status", {}),
    ]
    for path, params in onboarding_load_checks:
        response = client.get(path, params=params)
        assert response.status_code == 200, f"{path} failed: {response.text}"

    formal_profile = fetch_one(
        """
        SELECT math_type, target_score, level, class_id, intensive_days,
               review_order, plan_variant_id, primary_book_1, primary_book_1_scope,
               primary_book_2, primary_book_2_scope, backup_book,
               target_exam_date, paid_until
        FROM student_profiles
        WHERE user_id = ?
        """,
        (formal_user_id,),
    )
    assert formal_profile["math_type"] == "数学二"
    assert formal_profile["target_score"] == "126"
    assert formal_profile["level"] == "A"
    assert formal_profile["class_id"] == "A201"
    assert formal_profile["target_exam_date"] == "2026-12-19"
    assert formal_profile["paid_until"] == "2026-07-10"
    assert formal_profile["intensive_days"] == "45"
    assert formal_profile["review_order"] == "mixed"
    assert formal_profile["plan_variant_id"] == "math2_mixed"
    assert formal_profile["primary_book_1"] == "m2_880"
    assert formal_profile["primary_book_1_scope"] == "both"
    assert formal_profile["primary_book_2"] == "m2_1000"
    assert formal_profile["primary_book_2_scope"] == "advanced"
    assert formal_profile["backup_book"] == "m2_660"
    formal_class = fetch_one(
        "SELECT teacher_user_id, qq_group_number, group_name FROM classes WHERE class_id = ?",
        (formal_profile["class_id"],),
    )
    formal_study_goal = fetch_one(
        """
        SELECT g.study_date, r.class_id
        FROM student_study_goals g
        JOIN study_rooms r ON r.room_id = g.room_id
        WHERE g.user_id = ?
        """,
        (formal_user_id,),
    )
    assert formal_study_goal["study_date"] == formal_plan_date
    assert formal_study_goal["class_id"] == formal_profile["class_id"]
    formal_class_qq_group = formal_class["qq_group_number"] or formal_class["group_name"]
    formal_profile_api = client.get(f"/students/{formal_user_id}/profile", params={"date": formal_plan_date})
    assert formal_profile_api.status_code == 200, formal_profile_api.text
    assert formal_profile_api.json()["profile"]["qqGroup"] == formal_class_qq_group
    assert formal_profile_api.json()["profile"]["primaryBooks"] == ["880", "1000"]
    assert formal_profile_api.json()["profile"]["backupBooks"] == ["660"]
    teacher_formal_status = client.get(
        f"/teacher/classes/{formal_profile['class_id']}/daily-feedback-status",
        params={"teacherUserId": formal_class["teacher_user_id"], "date": formal_plan_date},
    )
    assert teacher_formal_status.status_code == 200, teacher_formal_status.text
    teacher_groups = teacher_formal_status.json()["groups"]
    assert any(item["userId"] == formal_user_id for item in teacher_groups["unsubmitted"])
    assert all(item["userId"] != formal_user_id for item in teacher_groups["unfinished"])

    formal_user_after_onboarding = fetch_one(
        "SELECT nickname, gender, QQ, avatar_url, password_changed_at FROM users WHERE user_id = ?",
        (formal_user_id,),
    )
    assert formal_user_after_onboarding["nickname"] == "林同学"
    assert formal_user_after_onboarding["gender"] == "male"
    assert formal_user_after_onboarding["QQ"] == "123456789"
    assert formal_user_after_onboarding["avatar_url"].endswith(".webp")
    assert formal_user_after_onboarding["password_changed_at"] != ""

    old_password_login = client.post(
        "/auth/login",
        json={"loginAccount": "stu60001", "password": activated["credential"]["initialPassword"]},
    )
    assert old_password_login.status_code == 400, old_password_login.text

    new_password_login = client.post(
        "/auth/login",
        json={"loginAccount": "stu60001", "password": "A1234567"},
    )
    assert new_password_login.status_code == 200, new_password_login.text
    assert new_password_login.json()["needsOnboarding"] is False

    execute_sql(
        """
        UPDATE admin_totp_state
        SET formal_activations_since_totp = ?
        WHERE admin_user_id = ?
        """,
        ("30", "adm001"),
    )
    totp_preview = client.get("/admin/formal-accounts/next-preview", params={"adminUserId": "adm001"})
    assert totp_preview.status_code == 200, totp_preview.text
    totp_credential = totp_preview.json()["credential"]
    assert totp_credential["loginAccount"] == "stu60002"
    blocked_activation = client.post(
        "/admin/formal-accounts/activate-next",
        json={"adminUserId": "adm001", "previewId": totp_credential["previewId"]},
    )
    assert blocked_activation.status_code == 200, blocked_activation.text
    assert blocked_activation.json()["requiresTotp"] is True
    totp_activation = client.post(
        "/admin/formal-accounts/activate-next",
        json={"adminUserId": "adm001", "previewId": totp_credential["previewId"], "totpCode": "123456"},
    )
    assert totp_activation.status_code == 200, totp_activation.text
    assert totp_activation.json()["requiresTotp"] is False
    assert totp_activation.json()["activatedAccount"] == "stu60002"

    second_login = client.post(
        "/auth/login",
        json={
            "loginAccount": totp_activation.json()["credential"]["loginAccount"],
            "password": totp_activation.json()["credential"]["initialPassword"],
        },
    )
    assert second_login.status_code == 200, second_login.text
    long_name_onboarding = client.post(
        f"/students/{second_login.json()['user']['userId']}/onboarding",
        json={
            "nickname": "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d",
            "gender": "male",
            "qq": "123456789",
            "newPassword": "B1234567",
            "confirmPassword": "B1234567",
            "mathType": "\u6570\u5b66\u4e8c",
            "targetScore": 120,
            "foundationLevel": "\u57fa\u7840\u4e00\u822c",
            "primaryBooks": [
                {"book": "880", "scope": "both"},
                {"book": "1000", "scope": "advanced"},
            ],
            "backupBook": "660",
            "dailyStudyHours": 3,
            "intensiveDays": 60,
            "reviewOrder": "mixed",
            "diagnosticAnswers": [
                {"questionId": "limit-equivalent-infinitesimal", "answer": "B"},
                {"questionId": "derivative-absolute-value", "answer": "B"},
            ],
        },
    )
    assert long_name_onboarding.status_code == 400, long_name_onboarding.text
    assert "5" in long_name_onboarding.json()["detail"]
    invalid_password_onboarding = client.post(
        f"/students/{second_login.json()['user']['userId']}/onboarding",
        json={
            "nickname": "密码错",
            "gender": "male",
            "qq": "123456789",
            "newPassword": "12345678",
            "confirmPassword": "12345678",
            "mathType": "数学二",
            "targetScore": 120,
            "foundationLevel": "基础一般",
            "primaryBooks": [
                {"book": "880", "scope": "both"},
                {"book": "1000", "scope": "advanced"},
            ],
            "backupBook": "660",
            "dailyStudyHours": 3,
            "intensiveDays": 60,
            "reviewOrder": "mixed",
            "diagnosticAnswers": [
                {"questionId": "limit-equivalent-infinitesimal", "answer": "B"},
                {"questionId": "derivative-absolute-value", "answer": "B"},
            ],
        },
    )
    assert invalid_password_onboarding.status_code == 400, invalid_password_onboarding.text

    admin_students_with_pending_formal = client.get("/admin/students")
    assert admin_students_with_pending_formal.status_code == 200, admin_students_with_pending_formal.text
    assert all(
        item["loginAccount"] != totp_activation.json()["credential"]["loginAccount"]
        for item in admin_students_with_pending_formal.json()["items"]
    )

    admin_accounts = client.get("/admin/accounts")
    assert admin_accounts.status_code == 200, admin_accounts.text
    account_items = admin_accounts.json()["items"]
    assert any(item["loginAccount"] == "stu10001" for item in account_items)
    assert any(item["role"] == "teacher" and item["loginAccount"] == "teacher01" for item in account_items)

    admin_teachers = client.get("/admin/teachers")
    assert admin_teachers.status_code == 200, admin_teachers.text
    assert any(item["loginAccount"] == "teacher01" and item["classes"] for item in admin_teachers.json()["items"])

    created_teacher = client.post(
        "/admin/teachers",
        json={
            "loginAccount": "teacher02",
            "nickname": "陈老师",
            "contactQQ": "724810002",
            "status": "active",
        },
    )
    assert created_teacher.status_code == 200, created_teacher.text
    new_teacher = created_teacher.json()["teacher"]
    assert new_teacher["loginAccount"] == "teacher02"
    assert new_teacher["userId"] != ""

    assigned_teacher = client.patch(
        f"/admin/teachers/{new_teacher['userId']}/classes",
        json={"classIds": ["A202"]},
    )
    assert assigned_teacher.status_code == 200, assigned_teacher.text
    assert "A202" in assigned_teacher.json()["teacher"]["classes"]

    patched_class = client.patch(
        "/admin/classes/A202",
        json={
            "className": "26考研数学二A02调整班",
            "teacherUserId": new_teacher["userId"],
            "qqGroupNumber": "783210499",
            "capacity": 55,
            "isAcceptingNewStudents": False,
        },
    )
    assert patched_class.status_code == 200, patched_class.text
    class_data = patched_class.json()["class"]
    assert class_data["teacherId"] == new_teacher["userId"]
    assert class_data["qqGroupNumber"] == "783210499"
    assert class_data["capacity"] == 55
    assert class_data["isAcceptingNewStudents"] is False

    admin_classes = client.get("/admin/classes")
    assert admin_classes.status_code == 200, admin_classes.text
    assert any(item["classId"] == "A202" and item["teacherId"] == new_teacher["userId"] for item in admin_classes.json()["items"])

    patched_student = client.patch(
        "/admin/students/10004",
        json={
            "level": "C",
            "classId": "B201",
            "mathType": "数学二",
            "targetScore": 118,
            "contactQQ": "248199999",
            "paidUntil": "2026-08-01",
            "primaryBooks": ["660", "880"],
            "backupBook": "1000",
            "manualNextTypeId": "G-03-02",
            "reviewOrder": "gaoshu_first",
        },
    )
    assert patched_student.status_code == 200, patched_student.text
    student_data = patched_student.json()["student"]
    assert student_data["level"] == "C"
    assert student_data["classId"] == "B201"
    assert student_data["targetScore"] == 118
    assert student_data["contactQQ"] == "248199999"
    assert student_data["reviewOrder"] == "gaoshu_first"
    saved_student = fetch_one(
        """
        SELECT u.QQ, p.level, p.class_id, p.target_score, p.primary_book_1, p.primary_book_2,
               p.backup_book, p.review_order, sp.current_type_id
        FROM users u
        JOIN student_profiles p ON p.user_id = u.user_id
        LEFT JOIN student_progress sp ON sp.user_id = u.user_id
        WHERE u.user_id = ?
        """,
        ("10004",),
    )
    assert saved_student["QQ"] == "248199999"
    assert saved_student["level"] == "C"
    assert saved_student["class_id"] == "B201"
    assert saved_student["target_score"] == "118"
    assert saved_student["primary_book_1"] == "m2_660"
    assert saved_student["primary_book_2"] == "m2_880"
    assert saved_student["backup_book"] == "m2_1000"
    assert saved_student["review_order"] == "gaoshu_first"
    assert saved_student["current_type_id"] == "G-03-02"

    password_before_reset = fetch_one("SELECT login_password FROM users WHERE user_id = ?", ("10004",))["login_password"]
    reset_student_password = client.post("/admin/accounts/10004/reset-password")
    assert reset_student_password.status_code == 200, reset_student_password.text
    temporary_password = reset_student_password.json()["temporaryPassword"]
    assert len(temporary_password) == 8
    assert temporary_password.startswith("R")
    old_reset_login = client.post("/auth/login", json={"loginAccount": "stu10004", "password": password_before_reset})
    assert old_reset_login.status_code == 400, old_reset_login.text
    reset_login = client.post("/auth/login", json={"loginAccount": "stu10004", "password": temporary_password})
    assert reset_login.status_code == 200, reset_login.text

    disabled_account = client.post("/admin/accounts/10004/disable")
    assert disabled_account.status_code == 200, disabled_account.text
    assert disabled_account.json()["account"]["accountStatus"] == "disabled"
    disabled_student_login = client.post("/auth/login", json={"loginAccount": "stu10004", "password": temporary_password})
    assert disabled_student_login.status_code == 400, disabled_student_login.text
    activated_account = client.post("/admin/accounts/10004/activate")
    assert activated_account.status_code == 200, activated_account.text
    assert activated_account.json()["account"]["accountStatus"] == "active"

    before_renewal = fetch_one("SELECT paid_until FROM student_profiles WHERE user_id = ?", ("10004",))
    renewed_student = client.post("/admin/students/10004/renew-service", json={"days": 30})
    assert renewed_student.status_code == 200, renewed_student.text
    assert renewed_student.json()["student"]["paidUntil"] > before_renewal["paid_until"]

    execute_sql("UPDATE student_profiles SET paid_until = ? WHERE user_id = ?", ("2026-06-01", "10011"))
    execute_sql("UPDATE users SET account_status = ? WHERE user_id = ?", ("expired_pending_review", "10011"))
    expired_trials = client.get("/admin/experience-accounts/expired")
    assert expired_trials.status_code == 200, expired_trials.text
    assert any(item["userId"] == "10011" for item in expired_trials.json()["items"])
    expired_trial_login = client.post("/auth/login", json={"loginAccount": "stu10011", "password": "123456"})
    assert expired_trial_login.status_code == 400, expired_trial_login.text
    assert "\u5230\u671f" in expired_trial_login.json()["detail"]

    migrated_trial = client.post("/admin/experience-accounts/10011/migrate-to-formal")
    assert migrated_trial.status_code == 200, migrated_trial.text
    migrated_data = migrated_trial.json()
    assert migrated_data["targetStudent"]["loginAccount"] == "stu40001"
    assert migrated_data["sourceStudent"]["accountStatus"] == "converted_to_formal"
    migrated_profile = fetch_one("SELECT class_id, paid_until FROM student_profiles WHERE user_id = ?", ("stu40001",))
    assert migrated_profile["class_id"] != ""
    assert migrated_profile["paid_until"] >= "2026-07-10"

    intake_settings = client.get("/admin/class-intake-settings")
    assert intake_settings.status_code == 200, intake_settings.text
    assert any(item["mathType"] == "数学二" and item["level"] == "B" for item in intake_settings.json()["items"])
    updated_intake = client.patch(
        "/admin/class-intake-settings/数学二/B",
        json={"activeClassId": "B202", "updatedBy": "adm001"},
    )
    assert updated_intake.status_code == 200, updated_intake.text
    assert updated_intake.json()["setting"]["activeClassId"] == "B202"

    teacher_classes = client.get("/teacher/classes", params={"teacherUserId": new_teacher["userId"]})
    assert teacher_classes.status_code == 200, teacher_classes.text
    assert any(item["classId"] == "A202" for item in teacher_classes.json()["items"])
    teacher_feedback = client.get(
        "/teacher/classes/A202/daily-feedback-status",
        params={"teacherUserId": new_teacher["userId"], "date": "2026-06-10"},
    )
    assert teacher_feedback.status_code == 200, teacher_feedback.text
    assert "groups" in teacher_feedback.json()
    teacher_student_status = client.get(
        "/teacher/students/10012/daily-status",
        params={"teacherUserId": new_teacher["userId"], "date": "2026-06-10"},
    )
    assert teacher_student_status.status_code == 200, teacher_student_status.text
    assert teacher_student_status.json()["student"]["userId"] == "10012"

    audit_logs = client.get("/admin/audit-logs")
    assert audit_logs.status_code == 200, audit_logs.text
    audit_items = audit_logs.json()["items"]
    assert any(item["action"] == "teacher.create" and item["target"] == new_teacher["userId"] for item in audit_items)
    assert any(item["action"] == "trial.migrate_to_formal" and item["target"] == "10011" for item in audit_items)

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
    assert new_profile["primary_book_1"] == "m2_880"
    assert new_profile["primary_book_2"] == "m2_1000"
    assert new_profile["backup_book"] == "m2_660"
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

    empty_notification_status = client.get(f"/students/{user_id}/notifications/status")
    assert empty_notification_status.status_code == 200, empty_notification_status.text
    assert empty_notification_status.json() == {"hasUnread": False}

    publish_response = client.post(
        "/admin/announcements",
        data={
            "title": "Tonight notice",
            "content": "Please finish today's feedback on time.",
            "createdBy": "adm001",
        },
    )
    assert publish_response.status_code == 200, publish_response.text
    announcement = publish_response.json()["announcement"]
    assert announcement["title"] == "Tonight notice"
    assert announcement["content"] == "Please finish today's feedback on time."
    assert announcement["audience"] == "activated_students"
    assert announcement["status"] == "published"
    assert announcement["imageUrl"] == ""

    unread_status = client.get(f"/students/{user_id}/notifications/status")
    assert unread_status.status_code == 200, unread_status.text
    assert unread_status.json()["hasUnread"] is True

    notifications = client.get(f"/students/{user_id}/notifications")
    assert notifications.status_code == 200, notifications.text
    notification_items = notifications.json()["items"]
    assert len(notification_items) == 1
    assert notification_items[0]["title"] == "Tonight notice"
    assert notification_items[0]["isRead"] is False

    read_all = client.post(f"/students/{user_id}/notifications/read-all")
    assert read_all.status_code == 200, read_all.text
    assert read_all.json() == {"hasUnread": False}

    read_status = client.get(f"/students/{user_id}/notifications/status")
    assert read_status.status_code == 200, read_status.text
    assert read_status.json()["hasUnread"] is False

    dynamic_late_student_status = client.get(f"/students/{new_user_id}/notifications/status")
    assert dynamic_late_student_status.status_code == 200, dynamic_late_student_status.text
    assert dynamic_late_student_status.json()["hasUnread"] is True

    invalid_image = client.post(
        "/admin/announcements",
        data={"title": "Bad image", "content": "gif is not allowed", "createdBy": "adm001"},
        files={"image": ("notice.gif", b"GIF89a", "image/gif")},
    )
    assert invalid_image.status_code == 400, invalid_image.text

    hide_response = client.post(f"/admin/announcements/{announcement['announcementId']}/hide")
    assert hide_response.status_code == 200, hide_response.text
    assert hide_response.json()["announcement"]["status"] == "hidden"

    hidden_notifications = client.get(f"/students/{new_user_id}/notifications")
    assert hidden_notifications.status_code == 200, hidden_notifications.text
    assert hidden_notifications.json()["items"] == []
    assert hidden_notifications.json()["hasUnread"] is False

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
    expired_user_id = "10005"
    expired_plan_date = "2026-06-10"
    expired_profile = fetch_one(
        "SELECT paid_until FROM student_profiles WHERE user_id = ?",
        (expired_user_id,),
    )
    expired_plan = client.get(f"/students/{expired_user_id}/daily-plan", params={"date": expired_plan_date})
    assert expired_plan.status_code == 200, expired_plan.text
    expected_expired_status = "expired" if expired_profile["paid_until"] < expired_plan_date else "in_progress"
    assert expired_plan.json()["plan"]["planStatus"] == expected_expired_status

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

    split_user_id = "10020"
    split_type_id = "T-SPLIT-016"
    execute_sql("DELETE FROM question_feedbacks WHERE user_id = ?", (split_user_id,))
    execute_sql("DELETE FROM daily_plans WHERE user_id = ?", (split_user_id,))
    execute_sql("DELETE FROM questions WHERE type_id = ?", (split_type_id,))
    execute_sql("DELETE FROM question_types WHERE type_id = ?", (split_type_id,))
    insert_row(
        "question_types",
        {
            "type_id": split_type_id,
            "sort_code": "Z-SPLIT-016",
            "subject": "高等数学",
            "chapter_id": "T-SPLIT",
            "chapter_name": "主动拆分测试章",
            "content_block": "知识点",
            "type_name": "主动拆分测试题型",
            "parent_type_id": "",
            "suggested_days": "1.6",
            "direct_assignable": "1",
            "lecture_image_url": "",
            "input_note": "",
        },
    )
    for question_order in range(1, 11):
        insert_row(
            "questions",
            {
                "question_id": f"SPLIT-016-Q{question_order:02d}",
                "type_id": split_type_id,
                "type_name_check": "主动拆分测试题型",
                "question_note": f"拆分测试第 {question_order} 题",
                "applicable_levels": "A,B,C,D",
                "plan_stage": "强化",
                "source": "880",
                "original_position_text": f"《880》第9章强化第{question_order}题",
                "question_order": str(question_order),
                "display_permission": "仅显示题号",
            },
        )
    execute_sql(
        """
        UPDATE student_progress
        SET current_type_id = ?, current_type_sort_code = ?, progress_status = 'active',
            current_type_status = 'active', last_generated_plan_date = '',
            last_completed_type_id = '', unfinished_type_id = '', unfinished_question_ids = '[]',
            carryover_type_id = '', carryover_question_ids = '[]'
        WHERE user_id = ?
        """,
        (split_type_id, "Z-SPLIT-016", split_user_id),
    )

    split_day_one = client.get(f"/students/{split_user_id}/daily-plan", params={"date": "2026-06-12"})
    assert split_day_one.status_code == 200, split_day_one.text
    split_day_one_data = split_day_one.json()
    split_day_one_type = split_day_one_data["plan"]["types"][0]
    assert split_day_one_type["typeId"] == split_type_id
    assert [item["questionId"] for item in split_day_one_type["questions"]] == [
        f"SPLIT-016-Q{question_order:02d}"
        for question_order in range(1, 8)
    ]
    split_progress_after_plan = fetch_one(
        """
        SELECT current_type_id, current_type_status, carryover_type_id, carryover_question_ids
        FROM student_progress
        WHERE user_id = ?
        """,
        (split_user_id,),
    )
    assert split_progress_after_plan["current_type_id"] == split_type_id
    assert split_progress_after_plan["current_type_status"] == "carryover"
    assert split_progress_after_plan["carryover_type_id"] == split_type_id
    assert json.loads(split_progress_after_plan["carryover_question_ids"]) == [
        "SPLIT-016-Q08",
        "SPLIT-016-Q09",
        "SPLIT-016-Q10",
    ]

    split_day_one_answers = [
        {"questionId": item["questionId"], "result": "correct"}
        for item in split_day_one_type["questions"]
    ]
    split_day_one_submit = client.post(
        "/feedback/submit",
        json={
            "userId": split_user_id,
            "planDate": split_day_one_data["plan"]["planDate"],
            "typeId": split_type_id,
            "answers": split_day_one_answers,
        },
    )
    assert split_day_one_submit.status_code == 200, split_day_one_submit.text
    assert split_day_one_submit.json()["planStatus"] == "completed"

    split_day_two = client.get(f"/students/{split_user_id}/daily-plan", params={"date": "2026-06-13"})
    assert split_day_two.status_code == 200, split_day_two.text
    split_day_two_type = split_day_two.json()["plan"]["types"][0]
    assert split_day_two_type["typeId"] == split_type_id
    assert [item["questionId"] for item in split_day_two_type["questions"]] == [
        "SPLIT-016-Q08",
        "SPLIT-016-Q09",
        "SPLIT-016-Q10",
    ]

    summary_user_id = "10021"
    summary_plan_date = "2026-06-14"
    summary_chapter_id = "T-SUM-A"
    summary_next_chapter_id = "T-SUM-B"
    summary_type_id = "T-SUM-A-01"
    summary_next_type_id = "T-SUM-B-01"
    summary_question_ids = ["SUM-A-Q01", "SUM-A-Q02", "SUM-A-Q03", "SUM-A-Q04", "SUM-A-Q05"]
    summary_profile = fetch_one(
        "SELECT math_type, current_stage FROM student_profiles WHERE user_id = ?",
        (summary_user_id,),
    )
    execute_sql("DELETE FROM question_feedbacks WHERE user_id = ? AND plan_date = ?", (summary_user_id, summary_plan_date))
    execute_sql("DELETE FROM daily_plans WHERE user_id = ? AND plan_date = ?", (summary_user_id, summary_plan_date))
    execute_sql("DELETE FROM student_chapter_completions WHERE user_id = ? AND raw_chapter_id = ?", (summary_user_id, summary_chapter_id))
    execute_sql("DELETE FROM type_mastery_stats WHERE user_id = ? AND stat_date = ?", (summary_user_id, summary_plan_date))
    execute_sql("DELETE FROM loss_reason_stats WHERE user_id = ? AND stat_date = ?", (summary_user_id, summary_plan_date))
    execute_sql("DELETE FROM question_feedbacks WHERE user_id = ? AND type_id IN (?, ?)", (summary_user_id, summary_type_id, summary_next_type_id))
    execute_sql("DELETE FROM questions WHERE type_id IN (?, ?)", (summary_type_id, summary_next_type_id))
    execute_sql("DELETE FROM question_types WHERE type_id IN (?, ?)", (summary_type_id, summary_next_type_id))
    execute_sql("DELETE FROM chapter_summary_templates WHERE summary_template_id = ?", ("CST-TEST-SUM-A",))
    insert_row(
        "question_types",
        {
            "type_id": summary_type_id,
            "sort_code": "T-SUM-A-01",
            "subject": "test",
            "chapter_id": summary_chapter_id,
            "chapter_name": "Test Summary Chapter",
            "content_block": "test",
            "type_name": "Test Summary Final Type",
            "parent_type_id": "",
            "suggested_days": "0.2",
            "direct_assignable": "1",
            "lecture_image_url": "",
            "input_note": "",
        },
    )
    insert_row(
        "question_types",
        {
            "type_id": summary_next_type_id,
            "sort_code": "T-SUM-B-01",
            "subject": "test",
            "chapter_id": summary_next_chapter_id,
            "chapter_name": "Test Next Chapter",
            "content_block": "test",
            "type_name": "Test Next Chapter Type",
            "parent_type_id": "",
            "suggested_days": "0.2",
            "direct_assignable": "1",
            "lecture_image_url": "",
            "input_note": "",
        },
    )
    for order, question_id in enumerate(summary_question_ids, start=1):
        insert_row(
            "questions",
            {
                "question_id": question_id,
                "type_id": summary_type_id,
                "type_name_check": "Test Summary Final Type",
                "question_note": f"summary question {order}",
                "applicable_levels": "A,B,C,D",
                "plan_stage": summary_profile["current_stage"],
                "source": "880",
                "original_position_text": f"summary question {order}",
                "question_order": str(order),
                "display_permission": "number",
            },
        )
    insert_row(
        "questions",
        {
            "question_id": "SUM-B-Q01",
            "type_id": summary_next_type_id,
            "type_name_check": "Test Next Chapter Type",
            "question_note": "next chapter question",
            "applicable_levels": "A,B,C,D",
            "plan_stage": summary_profile["current_stage"],
            "source": "880",
            "original_position_text": "next chapter question",
            "question_order": "1",
            "display_permission": "number",
        },
    )
    insert_row(
        "chapter_summary_templates",
        {
            "summary_template_id": "CST-TEST-SUM-A",
            "raw_chapter_id": summary_chapter_id,
            "chapter_id": summary_chapter_id,
            "chapter_name": "Test Summary Chapter",
            "math_type": summary_profile["math_type"],
            "plan_stage": summary_profile["current_stage"],
            "summary_title": "Test Summary Chapter Summary",
            "summary_text": "This chapter summary should appear after the final type is submitted.",
            "exam_focus": "PUBLIC EXAM FOCUS FROM TEMPLATE",
            "key_points": "PUBLIC KEY POINTS FROM TEMPLATE",
            "common_mistakes": "PUBLIC COMMON MISTAKES FROM TEMPLATE",
            "review_suggestions": "PUBLIC REVIEW SUGGESTIONS FROM TEMPLATE",
            "next_step_text": "continue to the next chapter",
            "is_active": "1",
            "created_at": "2026-06-10 14:00:00",
            "updated_at": "2026-06-10 14:00:00",
        },
    )
    for type_index, row in enumerate(
        [
            (summary_type_id, "Test Summary Final Type", summary_question_ids, "open"),
            (summary_next_type_id, "Test Next Chapter Type", ["SUM-B-Q01"], "locked"),
        ],
        start=1,
    ):
        row_type_id, type_name, question_ids, open_status = row
        for question_order, question_id in enumerate(question_ids, start=1):
            insert_row(
                "daily_plans",
                {
                    "plan_id": f"P{summary_plan_date.replace('-', '')}-{summary_user_id}",
                    "user_id": summary_user_id,
                    "plan_date": summary_plan_date,
                    "plan_status": "in_progress",
                    "slogan": "summary trigger test",
                    "exam_date": "2026-12-19",
                    "days_to_exam": "188",
                    "type_index": str(type_index),
                    "type_id": row_type_id,
                    "type_name": type_name,
                    "question_id": question_id,
                    "source": "880",
                    "original_position_text": f"{type_name} question {question_order}",
                    "question_order": str(question_order),
                    "feedback_open_status": open_status,
                    "created_at": "2026-06-14 06:00:00",
                    "updated_at": "2026-06-14 06:00:00",
                },
            )
    summary_submit = client.post(
        "/feedback/submit",
        json={
            "userId": summary_user_id,
            "planDate": summary_plan_date,
            "typeId": summary_type_id,
            "answers": [
                {"questionId": summary_question_ids[0], "result": "wrong", "wrongReason": "calculation_error"},
                {"questionId": summary_question_ids[1], "result": "wrong", "wrongReason": "calculation_error"},
                {"questionId": summary_question_ids[2], "result": "wrong", "wrongReason": "method_error"},
                {"questionId": summary_question_ids[3], "result": "wrong", "wrongReason": "method_error"},
                {"questionId": summary_question_ids[4], "result": "wrong", "wrongReason": "knowledge_gap"},
            ],
        },
    )
    assert summary_submit.status_code == 200, summary_submit.text
    summary_submit_data = summary_submit.json()
    assert summary_submit_data["planStatus"] == "in_progress"
    chapter_summary = summary_submit_data["dailyPlan"]["plan"]["chapterSummary"]
    assert chapter_summary["chapterId"] == summary_chapter_id
    assert chapter_summary["examFocus"] == "PUBLIC EXAM FOCUS FROM TEMPLATE"
    assert chapter_summary["keyPoints"] == ["PUBLIC KEY POINTS FROM TEMPLATE"]
    assert chapter_summary["commonMistakes"] == ["PUBLIC COMMON MISTAKES FROM TEMPLATE"]
    assert chapter_summary["reviewAdvice"] == "PUBLIC REVIEW SUGGESTIONS FROM TEMPLATE"
    assert chapter_summary["mainLossReasons"] == ["计算失误", "方法选择错误"]
    assert "reviewTypeIds" not in chapter_summary
    assert "reviewTypeNames" not in chapter_summary
    summary_next_open = next(
        item for item in summary_submit_data["dailyPlan"]["plan"]["types"] if item["typeId"] == summary_next_type_id
    )
    assert summary_next_open["feedbackOpenStatus"] == "open"

    summary_curve = client.get(f"/students/{summary_user_id}/curve", params={"date": summary_plan_date})
    assert summary_curve.status_code == 200, summary_curve.text
    summary_curve_data = summary_curve.json()
    summary_mastery = mastery_by_chapter(summary_curve_data, summary_chapter_id)
    assert summary_mastery["submittedQuestionCount"] == 5
    assert summary_mastery["wrongQuestionCount"] == 5
    assert summary_mastery["rate"] == 0
    calculation_reason = loss_reason_by_code(summary_curve_data, "calculation_error")
    assert calculation_reason["count"] == 2
    assert calculation_reason["rate"] == 40
    assert calculation_reason["trendDelta"] == 40
    assert summary_curve_data["curve"]["activity"][-1]["rawDate"] == summary_plan_date
    assert summary_curve_data["curve"]["activity"][-1]["completedQuestions"] == 5

    plan = client.get(f"/students/{user_id}/daily-plan", params={"date": "2026-06-10"})
    assert plan.status_code == 200, plan.text
    plan_data = plan.json()
    open_type = next(
        item for item in plan_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )
    first_open_question = open_type["questions"][0]
    assert set(
        [
            "bookDisplayLabel",
            "sourceChapterLabel",
            "sourceSectionLabel",
            "sourceSubsectionLabel",
            "sourceQuestionLabel",
        ]
    ).issubset(first_open_question)
    assert first_open_question["bookDisplayLabel"]
    assert first_open_question["sourceQuestionLabel"]

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

    advanced_day = client.post("/test-day/advance")
    assert advanced_day.status_code == 200, advanced_day.text
    advanced_day_data = advanced_day.json()
    assert advanced_day_data["currentTestDate"] == "2026-06-11"
    advanced_page_checks = [
        (f"/students/{user_id}/daily-plan", {"date": "2026-06-11"}),
        (f"/students/{user_id}/rankings", {"date": "2026-06-11"}),
        (f"/students/{user_id}/curve", {"date": "2026-06-11"}),
        (f"/students/{user_id}/study-room", {"date": "2026-06-11"}),
        (f"/students/{user_id}/profile", {"date": "2026-06-11"}),
    ]
    advanced_plan = None
    for path, params in advanced_page_checks:
        response = client.get(path, params=params)
        assert response.status_code == 200, f"{path} failed after test-day advance: {response.text}"
        if path.endswith("/daily-plan"):
            advanced_plan = response
    assert advanced_plan is not None
    advanced_plan_data = advanced_plan.json()
    assert advanced_plan_data["plan"]["planDate"] == "2026-06-11"
    assert advanced_plan_data["plan"]["types"][0]["typeId"] == progress_after_submit["current_type_id"]
    assert advanced_plan_data["plan"]["types"][0]["typeId"] != open_type["typeId"]

    assert fetch_one(
        "SELECT state_value FROM test_runtime_state WHERE state_key = ?",
        ("current_test_date",),
    )["state_value"] == "2026-06-11"
    other_test_user_login_after_advance = client.post("/auth/test-code", json={"code": "demo-b01"})
    assert other_test_user_login_after_advance.status_code == 200, other_test_user_login_after_advance.text
    assert other_test_user_login_after_advance.json()["user"]["currentTestDate"] == "2026-06-11"
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
    today_board = rankings_data["boards"]["today"]
    assert isinstance(today_board["rows"], list)
    assert today_board["myRank"] is None or today_board["myRank"] >= 1

    curve = client.get(f"/students/{user_id}/curve", params={"date": "2026-06-10"})
    assert curve.status_code == 200, curve.text
    curve_data = curve.json()
    assert curve_data["student"]["userId"] == user_id
    assert curve_data["curve"]["title"] == "数学能力成长曲线"
    assert len(curve_data["curve"]["activity"]) == 14
    assert curve_data["curve"]["activity"][0]["rawDate"] == "2026-05-28"
    assert curve_data["curve"]["activity"][-1]["rawDate"] == "2026-06-10"
    today_activity_before_focus = fetch_optional(
        """
        SELECT completed_minutes
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    ) or {"completed_minutes": "0"}
    assert curve_data["curve"]["activity"][-1]["minutes"] == int(today_activity_before_focus["completed_minutes"])
    expected_total_hours = round(
        sum(row["minutes"] for row in curve_data["curve"]["activity"]) / 60,
        1,
    )
    expected_max_hours = round(
        max(row["minutes"] for row in curve_data["curve"]["activity"]) / 60,
        1,
    )
    assert curve_data["curve"]["activitySummary"]["totalHours"] == expected_total_hours
    assert curve_data["curve"]["activitySummary"]["maxHours"] == expected_max_hours
    assert curve_data["curve"]["activitySummary"]["continuousDays"] >= 0
    assert curve_data["curve"]["masteryLabel"] == "章节掌握度"
    mastery_names = [row["name"] for row in curve_data["curve"]["mastery"]]
    assert mastery_names
    assert all(mastery_names)
    loss_names = [row["name"] for row in curve_data["curve"]["lossReasons"]]
    assert loss_names
    assert all(loss_names)
    assert "priorities" not in curve_data["curve"]
    assert curve_data["curve"]["weekly"]["completionRate"] >= 0
    assert curve_data["curve"]["weekly"]["questionCount"] >= 0
    assert curve_data["curve"]["weekly"]["completedTypeCount"] >= 0

    alternate_curve = client.get("/students/10016/curve", params={"date": "2026-06-10"})
    assert alternate_curve.status_code == 200, alternate_curve.text
    alternate_curve_data = alternate_curve.json()
    assert alternate_curve_data["student"]["userId"] == "10016"
    assert alternate_curve_data["curve"]["mastery"] != curve_data["curve"]["mastery"]
    if alternate_curve_data["curve"]["lossReasons"] and curve_data["curve"]["lossReasons"]:
        assert alternate_curve_data["curve"]["lossReasons"][0]["name"] != curve_data["curve"]["lossReasons"][0]["name"]
    assert "priorities" not in alternate_curve_data["curve"]

    zero_loss_curve = client.get("/students/10018/curve", params={"date": "2026-06-10"})
    assert zero_loss_curve.status_code == 200, zero_loss_curve.text
    assert all(row["rate"] >= 0 for row in zero_loss_curve.json()["curve"]["lossReasons"])

    sparse_loss_curve = client.get("/students/10019/curve", params={"date": "2026-06-10"})
    assert sparse_loss_curve.status_code == 200, sparse_loss_curve.text
    assert all(row["rate"] >= 0 for row in sparse_loss_curve.json()["curve"]["lossReasons"])

    study_room = client.get(f"/students/{user_id}/study-room", params={"date": "2026-06-10"})
    assert study_room.status_code == 200, study_room.text
    study_room_data = study_room.json()
    assert study_room_data["studyRoom"]["roomName"] == "数学二冲刺自习室"
    assert study_room_data["studyRoom"]["targetMinutes"] == 180
    daily_activity_before_focus = fetch_one(
        """
        SELECT completed_minutes
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    )
    assert study_room_data["studyRoom"]["completedMinutes"] == int(daily_activity_before_focus["completed_minutes"])
    assert len(study_room_data["studyRoom"]["taskOptions"]) == len(refreshed_data["plan"]["types"])
    assert study_room_data["studyRoom"]["taskOptions"][0]["typeId"] == refreshed_data["plan"]["types"][0]["typeId"]
    class_row = fetch_one("SELECT class_id FROM student_profiles WHERE user_id = ?", (user_id,))
    class_count = fetch_one(
        """
        SELECT COUNT(*) AS total
        FROM student_profiles p
        JOIN users u ON u.user_id = p.user_id
        WHERE p.class_id = ? AND u.role = 'student' AND u.account_status = 'active'
        """,
        (class_row["class_id"],),
    )["total"]
    classmates = fetch_all(
        """
        SELECT p.user_id, u.nickname
        FROM student_profiles p
        JOIN users u ON u.user_id = p.user_id
        WHERE p.class_id = ? AND p.user_id <> ? AND u.role = 'student' AND u.account_status = 'active'
        ORDER BY p.user_id
        LIMIT 3
        """,
        (class_row["class_id"], user_id),
    )
    assert len(classmates) >= 3
    running_peer, paused_peer, completed_peer = classmates[:3]
    task_type_id = study_room_data["studyRoom"]["taskOptions"][0]["typeId"]
    execute_sql(
        """
        INSERT INTO focus_sessions (
          session_id, user_id, class_id, plan_date, task_type_id, task_name,
          target_minutes, started_at, paused_at, resumed_at, ended_at,
          focused_seconds, counted_minutes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "FS-TEST-RUNNING-PEER",
            running_peer["user_id"],
            class_row["class_id"],
            "2026-06-10",
            task_type_id,
            "测试专注任务",
            "45",
            "2026-06-10 09:00:00",
            "",
            "",
            "",
            "0",
            "0",
            "running",
            "2026-06-10 09:00:00",
            "2026-06-10 09:00:00",
        ),
    )
    execute_sql(
        """
        INSERT INTO focus_sessions (
          session_id, user_id, class_id, plan_date, task_type_id, task_name,
          target_minutes, started_at, paused_at, resumed_at, ended_at,
          focused_seconds, counted_minutes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "FS-TEST-COMPLETED-PEER",
            completed_peer["user_id"],
            class_row["class_id"],
            "2026-06-10",
            task_type_id,
            "已完成的专注任务",
            "45",
            "2026-06-10 08:00:00",
            "",
            "",
            "2026-06-10 08:01:05",
            "65",
            "1",
            "completed",
            "2026-06-10 08:00:00",
            "2026-06-10 08:01:05",
        ),
    )
    execute_sql(
        """
        INSERT INTO focus_sessions (
          session_id, user_id, class_id, plan_date, task_type_id, task_name,
          target_minutes, started_at, paused_at, resumed_at, ended_at,
          focused_seconds, counted_minutes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "FS-TEST-PAUSED-PEER",
            paused_peer["user_id"],
            class_row["class_id"],
            "2026-06-10",
            task_type_id,
            "暂停中的专注任务",
            "45",
            "2026-06-10 09:05:00",
            "2026-06-10 09:10:00",
            "",
            "",
            "0",
            "0",
            "paused",
            "2026-06-10 09:05:00",
            "2026-06-10 09:10:00",
        ),
    )
    live_study_room = client.get(f"/students/{user_id}/study-room", params={"date": "2026-06-10"})
    assert live_study_room.status_code == 200, live_study_room.text
    live_room_data = live_study_room.json()["studyRoom"]
    assert live_room_data["classMemberCount"] == class_count
    live_member_ids = {member["userId"] for member in live_room_data["members"]}
    assert running_peer["user_id"] in live_member_ids
    assert paused_peer["user_id"] not in live_member_ids
    assert len(live_room_data["members"]) <= 4
    running_member = next(member for member in live_room_data["members"] if member["userId"] == running_peer["user_id"])
    assert running_member["name"] == f"{running_peer['nickname'][0]}同学"
    assert running_member["focusStatus"] == "running"
    completed_members = [
        member for member in live_room_data["members"]
        if member["focusStatus"] == "completed_today"
    ]
    assert completed_members
    assert all(member["focusedMinutes"] > 0 for member in completed_members)

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

    saved_session = fetch_one(
        "SELECT status, focused_seconds, counted_minutes FROM focus_sessions WHERE session_id = ?",
        (session_id,),
    )
    assert saved_session["status"] == "completed"
    assert saved_session["focused_seconds"] == "125"
    assert saved_session["counted_minutes"] == "2"

    daily_activity_after_focus = fetch_one(
        """
        SELECT completed_minutes, is_studied, intensity_level
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    )
    expected_completed_minutes = int(daily_activity_before_focus["completed_minutes"]) + 2
    assert int(daily_activity_after_focus["completed_minutes"]) == expected_completed_minutes
    assert daily_activity_after_focus["is_studied"] == "1"
    assert daily_activity_after_focus["intensity_level"] in {"low", "medium", "high"}
    assert finish_data["studyRoom"]["completedMinutes"] == expected_completed_minutes
    assert finish_data["profile"]["profile"]["todayStudyHours"] == round(expected_completed_minutes / 60, 1)
    assert finish_data["curve"]["curve"]["activity"][-1]["rawDate"] == "2026-06-10"
    assert finish_data["curve"]["curve"]["activity"][-1]["minutes"] == expected_completed_minutes

    duplicate_finish = client.post(
        f"/focus-sessions/{session_id}/finish",
        json={"focusedSeconds": 999},
    )
    assert duplicate_finish.status_code == 200, duplicate_finish.text
    duplicate_data = duplicate_finish.json()
    assert duplicate_data["session"]["focusedSeconds"] == 125
    assert duplicate_data["session"]["countedMinutes"] == 2
    daily_activity_after_duplicate = fetch_one(
        """
        SELECT completed_minutes
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    )
    assert int(daily_activity_after_duplicate["completed_minutes"]) == expected_completed_minutes

    capped_focus = client.post(
        "/focus-sessions/start",
        json={
            "userId": user_id,
            "planDate": "2026-06-10",
            "taskTypeId": study_room_data["studyRoom"]["taskOptions"][0]["typeId"],
            "targetMinutes": 45,
            "dailyTargetMinutes": 180,
        },
    )
    assert capped_focus.status_code == 200, capped_focus.text
    capped_session_id = capped_focus.json()["session"]["sessionId"]
    capped_finish = client.post(
        f"/focus-sessions/{capped_session_id}/finish",
        json={"focusedSeconds": 50 * 60},
    )
    assert capped_finish.status_code == 200, capped_finish.text
    capped_data = capped_finish.json()
    assert capped_data["session"]["focusedSeconds"] == 45 * 60
    assert capped_data["session"]["countedMinutes"] == 45
    daily_activity_after_capped = fetch_one(
        """
        SELECT completed_minutes
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    )
    assert int(daily_activity_after_capped["completed_minutes"]) == expected_completed_minutes + 45
    assert capped_data["studyRoom"]["completedMinutes"] == expected_completed_minutes + 45
    assert capped_data["profile"]["profile"]["todayStudyHours"] == round((expected_completed_minutes + 45) / 60, 1)
    assert capped_data["curve"]["curve"]["activity"][-1]["minutes"] == expected_completed_minutes + 45

    profile = client.get(f"/students/{user_id}/profile", params={"date": "2026-06-10"})
    assert profile.status_code == 200, profile.text
    profile_data = profile.json()
    assert profile_data["profile"]["nickname"] == login_data["user"]["nickname"]
    assert profile_data["profile"]["targetSchool"]["name"] == "未选择"
    assert profile_data["profile"]["examSubject"] == "数学二"
    assert profile_data["profile"]["dailyMathGoalHours"] == 3.0
    profile_books = fetch_one(
        """
        SELECT primary_book_1, primary_book_2, backup_book
        FROM student_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    )
    assert profile_data["profile"]["userId"] == user_id
    assert profile_data["profile"]["primaryBooks"] == [
        services.profile_book_display_code(profile_books["primary_book_1"]),
        services.profile_book_display_code(profile_books["primary_book_2"]),
    ]
    assert profile_data["profile"]["backupBooks"] == [services.profile_book_display_code(profile_books["backup_book"])]
    profile_daily_activity = fetch_one(
        """
        SELECT completed_minutes
        FROM student_daily_activity
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, "2026-06-10"),
    )
    assert profile_data["profile"]["todayStudyHours"] == round(int(profile_daily_activity["completed_minutes"]) / 60, 1)
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

    unfinished_user_id = "10005"
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

    mark_wrong_user_id = "10010"
    mark_wrong_plan = client.get(f"/students/{mark_wrong_user_id}/daily-plan", params={"date": "2026-06-11"})
    assert mark_wrong_plan.status_code == 200, mark_wrong_plan.text
    mark_wrong_plan_data = mark_wrong_plan.json()
    mark_wrong_open_type = next(
        item for item in mark_wrong_plan_data["plan"]["types"] if item["feedbackOpenStatus"] == "open"
    )
    mark_wrong_answers = [
        {
            "questionId": item["questionId"],
            "result": "unattempted",
            "wrongReason": "knowledge_gap",
        }
        for item in mark_wrong_open_type["questions"]
    ]
    mark_wrong_submit = client.post(
        "/feedback/submit",
        json={
            "userId": mark_wrong_user_id,
            "planDate": mark_wrong_plan_data["plan"]["planDate"],
            "typeId": mark_wrong_open_type["typeId"],
            "answers": mark_wrong_answers,
            "unattemptedAction": "mark_wrong",
        },
    )
    assert mark_wrong_submit.status_code == 200, mark_wrong_submit.text
    mark_wrong_submit_data = mark_wrong_submit.json()
    assert mark_wrong_submit_data["planStatus"] in {"in_progress", "completed"}
    assert mark_wrong_submit_data["hasUnattempted"] is True
    assert mark_wrong_submit_data["unattemptedAction"] == "mark_wrong"

    skipped_progress = fetch_one(
        """
        SELECT current_type_id, current_type_status, last_completed_type_id,
               unfinished_type_id, unfinished_question_ids
        FROM student_progress
        WHERE user_id = ?
        """,
        (mark_wrong_user_id,),
    )
    assert skipped_progress["current_type_status"] == "active"
    assert skipped_progress["last_completed_type_id"] == mark_wrong_open_type["typeId"]
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
