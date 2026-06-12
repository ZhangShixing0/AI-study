from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import services
from .settings import ROOT_DIR


app = FastAPI(title="AI 督学 MVP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROTOTYPE_DIR = ROOT_DIR / "prototypes" / "student-mobile-v0.1"
app.mount("/prototype", StaticFiles(directory=PROTOTYPE_DIR, html=True), name="prototype")
app.mount("/assets", StaticFiles(directory=PROTOTYPE_DIR / "assets"), name="prototype-assets")
app.mount("/styles", StaticFiles(directory=PROTOTYPE_DIR / "styles"), name="prototype-styles")
app.mount("/data", StaticFiles(directory=PROTOTYPE_DIR / "data"), name="prototype-data")


class LoginRequest(BaseModel):
    loginAccount: str
    password: str


class FeedbackAnswer(BaseModel):
    questionId: str
    result: Literal["correct", "wrong", "unattempted"]


class SubmitFeedbackRequest(BaseModel):
    userId: str
    planDate: str
    typeId: str
    answers: list[FeedbackAnswer]


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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def prototype_index() -> FileResponse:
    return FileResponse(PROTOTYPE_DIR / "index.html")


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict:
    try:
        return services.login(payload.loginAccount, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/students/{user_id}/daily-plan")
def daily_plan(user_id: str, date: str = services.CURRENT_DATE) -> dict:
    try:
        return services.get_daily_plan(user_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/rankings")
def rankings(user_id: str, date: str = services.CURRENT_DATE) -> dict:
    try:
        return services.get_rankings(user_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/curve")
def curve(user_id: str, date: str = services.CURRENT_DATE) -> dict:
    try:
        return services.get_curve(user_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/study-room")
def study_room(user_id: str, date: str = services.CURRENT_DATE) -> dict:
    try:
        return services.get_study_room(user_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{user_id}/profile")
def student_profile(user_id: str, date: str = services.CURRENT_DATE) -> dict:
    try:
        return services.get_student_profile(user_id, date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/institutions/search")
def institutions_search(q: str = "", limit: int = 20) -> dict:
    return services.search_institutions(q, limit)


@app.post("/students/{user_id}/target-school")
def target_school(user_id: str, payload: UpdateSchoolRequest) -> dict:
    try:
        return services.update_target_school(user_id, payload.schoolId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/feedback/submit")
def submit_feedback(payload: SubmitFeedbackRequest) -> dict:
    try:
        return services.submit_feedback(
            payload.userId,
            payload.planDate,
            payload.typeId,
            [answer.model_dump() for answer in payload.answers],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/start")
def start_focus(payload: StartFocusRequest) -> dict:
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
def pause_focus(session_id: str) -> dict:
    try:
        return services.update_focus_status(session_id, "paused")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/{session_id}/resume")
def resume_focus(session_id: str) -> dict:
    try:
        return services.update_focus_status(session_id, "running")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/focus-sessions/{session_id}/finish")
def finish_focus(session_id: str, payload: FinishFocusRequest) -> dict:
    try:
        return services.finish_focus_session(session_id, payload.focusedSeconds)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
