# Test Day Advance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each test user independently advance to the next simulated day and load a complete set of page data for that day.

**Architecture:** Store a per-user `current_test_date` in SQLite. The test-only advance endpoint increments only that user's date, runs existing pointer-driven daily-plan generation for the new date, and seeds minimal supporting rows for curve/rank/study-room/profile pages. The v1.2 frontend calls this endpoint instead of locally adding one day.

**Tech Stack:** FastAPI, SQLite, vanilla JS static frontend.

---

### Task 1: Backend Test Coverage

**Files:**
- Modify: `backend/test_flow.py`

- [ ] Add assertions that `POST /students/{user_id}/test-day/advance` returns `currentTestDate`, a generated `dailyPlan`, and does not advance another user's test date.
- [ ] Assert the generated plan uses the existing `student_progress.current_type_id/current_type_status` behavior rather than copying yesterday.
- [ ] Assert the new date has supporting rows for `student_stats`, `student_daily_activity`, and `student_study_goals`.

### Task 2: Backend Implementation

**Files:**
- Modify: `backend/services.py`
- Modify: `backend/main.py`
- Modify: `backend/seed_db.py`

- [ ] Add `test_user_dates` creation/migration helper.
- [ ] Add `currentTestDate` to auth user payloads.
- [ ] Implement `advance_test_day(user_id)` that increments only this user's test date.
- [ ] Generate the new date's daily plan via existing `get_daily_plan()` / `generate_daily_plan()` logic.
- [ ] Seed minimal supporting rows for the new date so rank/curve/study-room/profile pages load.
- [ ] Expose `POST /students/{user_id}/test-day/advance`.

### Task 3: Frontend Integration

**Files:**
- Modify: `prototypes/student-mobile-v1.2/assets/js/app.js`

- [ ] Initialize `activePlanDate` from the logged-in user's `currentTestDate` when no URL date is supplied.
- [ ] Change the "开启下一日计划" button to call the new advance endpoint.
- [ ] Refresh all page data using the returned `currentTestDate`.

### Task 4: Verification

**Commands:**
- `.\.venv\Scripts\python.exe -m py_compile backend\main.py backend\services.py backend\seed_db.py backend\test_flow.py`
- `.\.venv\Scripts\python.exe -m backend.test_flow`
- `node --check prototypes\student-mobile-v1.2\assets\js\app.js`
- `node --check prototypes\student-mobile-v1.2\assets\js\pages\plan.js`
