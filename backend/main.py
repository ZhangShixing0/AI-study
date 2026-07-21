from __future__ import annotations

import uuid
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
from urllib.parse import parse_qs, quote

from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import public_seed
from . import services
from .settings import CORS_ALLOWED_ORIGINS, ROOT_DIR


RELEASE_VERSION = (ROOT_DIR / "VERSION").read_text(encoding="utf-8").strip()
app = FastAPI(title="AI 督学 API", version=RELEASE_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=bool(CORS_ALLOWED_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

PROTOTYPE_DIR = ROOT_DIR / "prototypes" / "student-mobile-v3.3"
ADMIN_CONSOLE_DIR = ROOT_DIR / "prototypes" / "admin-teacher-console-v0.1"
app.mount("/prototype", StaticFiles(directory=PROTOTYPE_DIR, html=True), name="prototype")
app.mount("/assets", StaticFiles(directory=PROTOTYPE_DIR / "assets"), name="prototype-assets")
app.mount("/styles", StaticFiles(directory=PROTOTYPE_DIR / "styles"), name="prototype-styles")
app.mount("/admin-console", StaticFiles(directory=ADMIN_CONSOLE_DIR, html=True), name="admin-console")

ANNOUNCEMENT_UPLOAD_DIR = ROOT_DIR / "data" / "uploads" / "announcements"
ANNOUNCEMENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads/announcements",
    StaticFiles(directory=ANNOUNCEMENT_UPLOAD_DIR),
    name="announcement-uploads",
)


@app.on_event("startup")
def run_database_migrations() -> None:
    services.assert_runtime_database_ready()
    services.run_startup_migrations()


class LoginRequest(BaseModel):
    loginAccount: str
    password: str
    deviceId: str = ""
    deviceName: str = ""
    setupToken: str = ""
    totpCode: str = ""


class RiskAuthorizationRequest(BaseModel):
    totpCode: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str


class TeacherProfileRequest(BaseModel):
    contactQQ: str


class TestCodeRequest(BaseModel):
    code: str


class FormalPreviewRefreshRequest(BaseModel):
    adminUserId: str = "adm001"
    previewId: str


class FormalAccountActivateRequest(BaseModel):
    adminUserId: str = "adm001"
    previewId: str
    totpCode: str = ""


class OnboardingRequest(BaseModel):
    targetScore: int
    level: Literal["A", "B", "C", "D"]
    primaryBooks: list[str] = ["880", "1000"]
    backupBook: str = "660"
    dailyTargetMinutes: int = 180


class FeedbackAnswer(BaseModel):
    questionId: str
    result: Literal["correct", "wrong", "unattempted"]
    wrongReason: str | None = None
    unattemptedAction: Literal["mark_wrong", "defer"] | None = None


class SubmitFeedbackRequest(BaseModel):
    userId: str
    planDate: str
    typeId: str
    answers: list[FeedbackAnswer]
    unattemptedAction: Literal["mark_wrong", "defer"] | None = None


class StartFocusRequest(BaseModel):
    userId: str
    planDate: str
    taskTypeId: str
    targetMinutes: int
    dailyTargetMinutes: int | None = None


class FinishFocusRequest(BaseModel):
    focusedSeconds: int


class UpdateSchoolRequest(BaseModel):
    schoolId: str


def parse_multipart_form(content_type: str, body: bytes) -> tuple[dict[str, str], dict[str, Any] | None]:
    message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + body
    )
    fields: dict[str, str] = {}
    image: dict[str, Any] | None = None
    if not message.is_multipart():
        return fields, image

    for part in message.iter_parts():
        if part.get_content_disposition() != "form-data":
            continue
        name = part.get_param("name", header="content-disposition")
        filename = part.get_param("filename", header="content-disposition")
        payload = part.get_payload(decode=True) or b""
        if not name:
            continue
        if filename:
            image = {
                "filename": Path(filename).name,
                "content_type": part.get_content_type(),
                "content": payload,
            }
            continue
        charset = part.get_content_charset() or "utf-8"
        fields[name] = payload.decode(charset, errors="replace")
    return fields, image


async def parse_announcement_request(request: Request) -> tuple[dict[str, str], dict[str, Any] | None]:
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    if "multipart/form-data" in content_type.lower():
        return parse_multipart_form(content_type, body)
    if "application/x-www-form-urlencoded" in content_type.lower():
        parsed = parse_qs(body.decode("utf-8", errors="replace"), keep_blank_values=True)
        return {key: values[-1] if values else "" for key, values in parsed.items()}, None
    if "application/json" in content_type.lower():
        data = await request.json()
        return {key: str(value) for key, value in data.items()}, None
    return {}, None


def save_announcement_upload(image: dict[str, Any] | None) -> dict[str, Any] | None:
    if not image:
        return None
    content = image.get("content") or b""
    content_type = str(image.get("content_type") or "").lower()
    services.validate_announcement_image_meta(
        {
            "content_type": content_type,
            "size": len(content),
        }
    )
    suffix = services.ANNOUNCEMENT_ALLOWED_IMAGE_TYPES[content_type]
    safe_name = f"{services.now_text().replace(':', '').replace(' ', '-')}-{uuid.uuid4().hex[:8]}{suffix}"
    target = ANNOUNCEMENT_UPLOAD_DIR / safe_name
    target.write_bytes(content)
    return {
        "url": f"/uploads/announcements/{safe_name}",
        "filename": safe_name,
        "original_name": image.get("filename") or safe_name,
        "content_type": content_type,
        "size": len(content),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": RELEASE_VERSION}


@app.get("/")
def prototype_index() -> FileResponse:
    return FileResponse(PROTOTYPE_DIR / "index.html")


@app.get("/data/experience-data.js")
def prototype_experience_data() -> FileResponse:
    path = PROTOTYPE_DIR / "data" / "experience-data.js"
    if not path.exists():
        raise HTTPException(status_code=404, detail="experience data not found")
    return FileResponse(path, media_type="application/javascript")


@app.get("/public/registration-options")
def public_registration_options(mathType: str = "数学二") -> dict:
    try:
        return public_seed.get_registration_options(mathType)
    except public_seed.PublicSeedUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def auth_error(exc: services.SessionAuthError) -> HTTPException:
    return HTTPException(status_code=401, detail={"code": exc.code, "message": exc.message})


def request_date(value: str | None = None) -> str:
    return services.resolve_requested_date(value)


def bearer_token(authorization: str) -> str:
    prefix = "Bearer "
    return authorization[len(prefix):].strip() if authorization.startswith(prefix) else ""


@app.get("/auth/me")
def auth_me(
    userId: str = "10001",
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    if not authorization and not x_session_id:
        try:
            return {"user": services.get_admin_account(userId)}
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    try:
        return services.auth_me(bearer_token(authorization), x_session_id, x_device_id)
    except services.SessionAuthError as exc:
        raise auth_error(exc) from exc


def require_student_session(
    user_id: str,
    authorization: str,
    x_session_id: str,
    x_device_id: str,
) -> dict[str, Any]:
    try:
        with services.get_connection() as conn:
            return services.validate_student_session(
                conn,
                bearer_token(authorization),
                x_session_id,
                x_device_id,
                required_user_id=user_id,
            )
    except services.SessionAuthError as exc:
        raise auth_error(exc) from exc


def require_admin_session(
    authorization: str,
    x_session_id: str,
    x_device_id: str,
) -> dict[str, Any]:
    try:
        with services.get_connection() as conn:
            return services.validate_admin_session(
                conn,
                bearer_token(authorization),
                x_session_id,
                x_device_id,
            )
    except services.SessionAuthError as exc:
        raise auth_error(exc) from exc


def require_teacher_session(
    authorization: str,
    x_session_id: str,
    x_device_id: str,
) -> dict[str, Any]:
    try:
        with services.get_connection() as conn:
            return services.validate_teacher_session(
                conn,
                bearer_token(authorization),
                x_session_id,
                x_device_id,
            )
    except services.SessionAuthError as exc:
        raise auth_error(exc) from exc


@app.get("/api/test-clock")
def test_clock() -> dict:
    if services.is_production_runtime():
        return {"currentDate": services.current_date_text(), "offsetDays": 0}
    return services.get_test_clock()


@app.post("/api/test-clock/next-day")
def advance_test_clock() -> dict:
    if services.is_production_runtime():
        raise HTTPException(status_code=404, detail="测试日期接口在正式环境已禁用")
    try:
        return services.advance_test_clock()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/logout")
def auth_logout() -> dict[str, bool]:
    return {"ok": True}


@app.get("/admin/accounts")
def admin_accounts(
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_admin_session(authorization, x_session_id, x_device_id)
    return services.list_admin_accounts()


@app.get("/admin/accounts/{user_id}")
def admin_account(user_id: str) -> dict:
    try:
        return services.get_admin_account(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/admin/accounts/{user_id}/activate")
def admin_activate_account(user_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        actor = (payload or {}).get("actor", "adm001")
        return services.set_account_status(user_id, "active", actor=actor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/accounts/{user_id}/disable")
def admin_disable_account(user_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        actor = (payload or {}).get("actor", "adm001")
        return services.set_account_status(user_id, "disabled", actor=actor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/accounts/{user_id}/reset-password")
def admin_reset_account_password(
    user_id: str,
    payload: dict[str, Any] | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_admin_session(authorization, x_session_id, x_device_id)
    try:
        with services.get_connection() as conn:
            services.require_recent_admin_risk_authorization(conn, session["user_id"])
        actor = (payload or {}).get("actor", session["user_id"])
        return services.reset_account_password(user_id, actor=actor)
    except ValueError as exc:
        if str(exc) == "TOTP_REQUIRED":
            raise HTTPException(status_code=403, detail="TOTP_REQUIRED") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/teachers")
def admin_teachers(
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_admin_session(authorization, x_session_id, x_device_id)
    return services.list_admin_teachers()


@app.post("/admin/teachers")
def admin_create_teacher(
    payload: dict[str, Any],
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_admin_session(authorization, x_session_id, x_device_id)
    try:
        with services.get_connection() as conn:
            services.require_recent_admin_risk_authorization(conn, session["user_id"])
        return services.create_admin_teacher(payload, actor=payload.get("actor", session["user_id"]))
    except ValueError as exc:
        if str(exc) == "TOTP_REQUIRED":
            raise HTTPException(status_code=403, detail="TOTP_REQUIRED") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/admin/teachers/{teacher_id}/classes")
def admin_update_teacher_classes(
    teacher_id: str,
    payload: dict[str, Any],
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_admin_session(authorization, x_session_id, x_device_id)
    try:
        with services.get_connection() as conn:
            services.require_recent_admin_risk_authorization(conn, session["user_id"])
        return services.update_teacher_classes(
            teacher_id,
            [str(item) for item in payload.get("classIds", [])],
            actor=payload.get("actor", session["user_id"]),
        )
    except ValueError as exc:
        if str(exc) == "TOTP_REQUIRED":
            raise HTTPException(status_code=403, detail="TOTP_REQUIRED") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/admin/teachers/{teacher_id}/status")
def admin_update_teacher_status(
    teacher_id: str,
    payload: dict[str, Any],
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_admin_session(authorization, x_session_id, x_device_id)
    try:
        with services.get_connection() as conn:
            services.require_recent_admin_risk_authorization(conn, session["user_id"])
        return services.update_teacher_status(
            teacher_id,
            str(payload.get("status") or "active"),
            actor=payload.get("actor", session["user_id"]),
            nickname=payload.get("nickname"),
        )
    except ValueError as exc:
        if str(exc) == "TOTP_REQUIRED":
            raise HTTPException(status_code=403, detail="TOTP_REQUIRED") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/classes")
def admin_classes() -> dict:
    return services.list_admin_classes()


@app.post("/admin/classes")
def admin_create_class(payload: dict[str, Any]) -> dict:
    try:
        return services.create_admin_class(payload, actor=payload.get("actor", "adm001"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/admin/classes/{class_id}")
def admin_update_class(class_id: str, payload: dict[str, Any]) -> dict:
    try:
        return services.patch_admin_class(class_id, payload, actor=payload.get("actor", "adm001"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/students")
def admin_students(date: str | None = None) -> dict:
    return services.list_admin_students(date)


@app.get("/admin/chapter-options")
def admin_chapter_options(mathType: str = "数学二", planVariantId: str = "") -> dict:
    return services.list_admin_chapter_options(mathType, planVariantId)


@app.patch("/admin/students/{student_id}")
def admin_update_student(student_id: str, payload: dict[str, Any]) -> dict:
    try:
        return services.patch_admin_student(student_id, payload, actor=payload.get("actor", "adm001"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/students/{student_id}/wrong-questions.xlsx")
def admin_student_wrong_questions_export(student_id: str) -> Response:
    try:
        content, filename = services.build_admin_wrong_question_export(student_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@app.post("/admin/students/{student_id}/renew-service")
def admin_renew_student_service(student_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        data = payload or {}
        return services.renew_student_service(
            student_id,
            int(data.get("days") or 30),
            actor=data.get("actor", "adm001"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/experience-accounts/expired")
def admin_expired_experience_accounts(date: str | None = None) -> dict:
    return services.list_expired_experience_accounts(date)


@app.post("/admin/experience-accounts/{student_id}/migrate-to-formal")
def admin_migrate_experience_account(student_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        actor = (payload or {}).get("actor", "adm001")
        return services.migrate_experience_to_formal(student_id, actor=actor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/audit-logs")
def admin_audit_logs(limit: int = 100) -> dict:
    return services.list_admin_audit_logs(limit)


@app.get("/admin/class-intake-settings")
def admin_class_intake_settings() -> dict:
    return services.list_class_intake_settings()


@app.patch("/admin/class-intake-settings/{math_type}/{level}")
def admin_update_class_intake_setting(math_type: str, level: str, payload: dict[str, Any]) -> dict:
    try:
        return services.update_class_intake_setting(
            math_type,
            level,
            payload,
            actor=payload.get("actor", "adm001"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/teacher/classes")
def teacher_classes(
    teacherUserId: str = "",
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_teacher_session(authorization, x_session_id, x_device_id)
    try:
        return services.list_teacher_classes(session["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/teacher/password")
def teacher_change_password(
    payload: ChangePasswordRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_teacher_session(authorization, x_session_id, x_device_id)
    try:
        return services.change_teacher_password(
            session["user_id"],
            payload.currentPassword,
            payload.newPassword,
            payload.confirmPassword,
            x_session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/teacher/profile")
def teacher_update_profile(
    payload: TeacherProfileRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_teacher_session(authorization, x_session_id, x_device_id)
    try:
        return services.update_teacher_profile(session["user_id"], payload.contactQQ)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/teacher/classes/{class_id}/daily-feedback-status")
def teacher_class_daily_feedback_status(
    class_id: str,
    teacherUserId: str = "",
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_teacher_session(authorization, x_session_id, x_device_id)
    try:
        return services.teacher_class_feedback_status(class_id, session["user_id"], request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/teacher/students/{student_id}/daily-status")
def teacher_student_daily_status(
    student_id: str,
    teacherUserId: str = "",
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_teacher_session(authorization, x_session_id, x_device_id)
    try:
        return services.teacher_student_daily_status(student_id, session["user_id"], request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/admin/announcements")
def admin_announcements() -> dict:
    return services.list_admin_announcements()


@app.post("/admin/announcements")
async def admin_create_announcement(request: Request) -> dict:
    try:
        fields, image = await parse_announcement_request(request)
        image_meta = save_announcement_upload(image)
        return services.create_announcement(
            fields.get("title", ""),
            fields.get("content", ""),
            image_meta,
            fields.get("createdBy", "adm001"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/announcements/{announcement_id}/hide")
def admin_hide_announcement(announcement_id: str) -> dict:
    try:
        return services.hide_announcement(announcement_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict:
    try:
        return services.login(
            payload.loginAccount,
            payload.password,
            device_id=payload.deviceId,
            device_name=payload.deviceName,
            ip_address=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
            setup_token=payload.setupToken,
            totp_code=payload.totpCode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/risk-authorizations/verify")
def admin_risk_authorization_verify(
    payload: RiskAuthorizationRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_admin_session(authorization, x_session_id, x_device_id)
    try:
        return services.verify_admin_risk_authorization(session["user_id"], payload.totpCode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/test-code")
def test_code_login(payload: TestCodeRequest) -> dict:
    try:
        return services.login_with_test_code(payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/formal-accounts/next-preview")
def admin_formal_account_preview(adminUserId: str = "adm001") -> dict:
    try:
        return services.get_or_create_formal_account_preview(adminUserId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/formal-accounts/next-preview/refresh")
def admin_formal_account_refresh(payload: FormalPreviewRefreshRequest) -> dict:
    try:
        return services.refresh_formal_account_preview(payload.adminUserId, payload.previewId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/formal-accounts/pending-onboarding")
def admin_formal_pending_onboarding(adminUserId: str = "adm001") -> dict:
    try:
        return services.list_pending_formal_onboarding(adminUserId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/formal-accounts/activate-next")
def admin_formal_account_activate(payload: FormalAccountActivateRequest) -> dict:
    try:
        return services.activate_next_formal_account(
            payload.adminUserId,
            payload.previewId,
            payload.totpCode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/short-term-accounts/activate-next")
def admin_short_term_account_activate(payload: dict[str, Any] | None = None) -> dict:
    try:
        data = payload or {}
        return services.activate_next_short_term_account(
            admin_user_id=data.get("adminUserId", "adm001"),
            duration_days=int(data.get("durationDays") or 7),
            math_type=data.get("mathType", "数学二"),
            level=data.get("level", "A"),
            target_score=int(data.get("targetScore") or 120),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/short-term-accounts")
def admin_short_term_accounts(date: str | None = None) -> dict:
    try:
        return services.list_short_term_accounts(date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/short-term-accounts/{student_id}")
def admin_short_term_account_detail(student_id: str, date: str | None = None) -> dict:
    try:
        return services.get_short_term_account_detail(student_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/admin/short-term-accounts/{student_id}/deactivate")
def admin_short_term_account_deactivate(student_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        return services.deactivate_short_term_account(student_id, actor=(payload or {}).get("actor", "adm001"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/short-term-accounts/{student_id}/migrate-to-formal")
def admin_short_term_account_migrate_to_formal(student_id: str, payload: dict[str, Any] | None = None) -> dict:
    try:
        return services.migrate_experience_to_formal(student_id, actor=(payload or {}).get("actor", "adm001"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/students/{user_id}/onboarding")
def complete_onboarding(
    user_id: str,
    payload: dict[str, Any],
    request: Request,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    session = require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.complete_onboarding(
            user_id,
            payload,
            session_context={
                "device_id": x_device_id or session.get("device_id") or "",
                "device_name": session.get("device_name") or "",
                "ip_address": request.client.host if request.client else session.get("ip_address") or "",
                "user_agent": request.headers.get("user-agent", "") or session.get("user_agent") or "",
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/students/{user_id}/question-preview/options")
def question_preview_options(
    user_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_question_preview_options(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/question-preview/types/{type_id}")
def question_preview_type(
    user_id: str,
    type_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_question_preview_type(user_id, type_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/daily-plan")
def daily_plan(
    user_id: str,
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_daily_plan(user_id, request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/students/{user_id}/test-day/advance")
def advance_test_day(
    user_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    if services.is_production_runtime():
        raise HTTPException(status_code=404, detail="测试日期接口在正式环境已禁用")
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.advance_test_day(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/test-day/advance")
def advance_global_test_day(userId: str = "10001") -> dict:
    if services.is_production_runtime():
        raise HTTPException(status_code=404, detail="测试日期接口在正式环境已禁用")
    try:
        return services.advance_global_test_day(userId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/students/{user_id}/rankings")
def rankings(
    user_id: str,
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_rankings(user_id, request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/curve")
def curve(
    user_id: str,
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_curve(user_id, request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/study-room")
def study_room(
    user_id: str,
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_study_room(user_id, request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/profile")
def student_profile(
    user_id: str,
    date: str | None = None,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_student_profile(user_id, request_date(date))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/notifications/status")
def student_notification_status(
    user_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_student_notification_status(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/notifications")
def student_notifications(
    user_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.get_student_notifications(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/students/{user_id}/notifications/read-all")
def student_notifications_read_all(
    user_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.mark_student_notifications_read(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/institutions/search")
def institutions_search(q: str = "", limit: int = 20) -> dict:
    return services.search_institutions(q, limit)


@app.post("/students/{user_id}/target-school")
def target_school(
    user_id: str,
    payload: UpdateSchoolRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(user_id, authorization, x_session_id, x_device_id)
    try:
        return services.update_target_school(user_id, payload.schoolId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/feedback/submit")
def submit_feedback(
    payload: SubmitFeedbackRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(payload.userId, authorization, x_session_id, x_device_id)
    try:
        return services.submit_feedback(
            payload.userId,
            payload.planDate,
            payload.typeId,
            [answer.model_dump() for answer in payload.answers],
            payload.unattemptedAction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/start")
def start_focus(
    payload: StartFocusRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    require_student_session(payload.userId, authorization, x_session_id, x_device_id)
    try:
        return services.start_focus_session(
            payload.userId,
            payload.planDate,
            payload.taskTypeId,
            payload.targetMinutes,
            payload.dailyTargetMinutes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/{session_id}/pause")
def pause_focus(
    session_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    try:
        session = require_student_session("", authorization, x_session_id, x_device_id)
        owner_user_id = services.focus_session_user_id(session_id)
        if str(owner_user_id) != str(session["user_id"]):
            raise auth_error(services.SessionAuthError("SESSION_FORBIDDEN", "不能访问其他学生数据"))
        return services.update_focus_status(session_id, "paused")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/{session_id}/resume")
def resume_focus(
    session_id: str,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    try:
        session = require_student_session("", authorization, x_session_id, x_device_id)
        owner_user_id = services.focus_session_user_id(session_id)
        if str(owner_user_id) != str(session["user_id"]):
            raise auth_error(services.SessionAuthError("SESSION_FORBIDDEN", "不能访问其他学生数据"))
        return services.update_focus_status(session_id, "running")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/{session_id}/finish")
def finish_focus(
    session_id: str,
    payload: FinishFocusRequest,
    authorization: str = Header(default=""),
    x_session_id: str = Header(default=""),
    x_device_id: str = Header(default=""),
) -> dict:
    try:
        session = require_student_session("", authorization, x_session_id, x_device_id)
        owner_user_id = services.focus_session_user_id(session_id)
        if str(owner_user_id) != str(session["user_id"]):
            raise auth_error(services.SessionAuthError("SESSION_FORBIDDEN", "不能访问其他学生数据"))
        return services.finish_focus_session(session_id, payload.focusedSeconds)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
