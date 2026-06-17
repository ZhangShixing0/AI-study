# Test Code Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an internal beta entry flow where a fixed test code opens an existing user space or creates a new numeric user that completes onboarding before receiving a question-level daily plan.

**Architecture:** Keep the existing `users`, `student_profiles`, `student_progress`, `daily_plans`, and `question_feedbacks` tables as the source of truth. Add a small `test_access_codes` table and two FastAPI endpoints for test-code entry and onboarding.

**Tech Stack:** FastAPI, SQLite, pandas-based seed data, static HTML/CSS/JavaScript prototype.

---

### Task 1: Backend Test Coverage

**Files:**
- Modify: `backend/test_flow.py`

- [ ] **Step 1: Write failing integration tests**

Add assertions that `/auth/test-code` accepts a seeded existing-user code, accepts an unused code by creating the next numeric user, rejects unknown codes, and reports `needsOnboarding` until `/students/{user_id}/onboarding` saves `target_score`, `level`, `primary_book_1`, `primary_book_2`, and `backup_book`.

- [ ] **Step 2: Verify red**

Run: `.\.venv\Scripts\python.exe -m backend.test_flow`

Expected: FAIL because `/auth/test-code` does not exist yet.

### Task 2: Database and Service Layer

**Files:**
- Modify: `backend/seed_db.py`
- Modify: `backend/services.py`

- [ ] **Step 1: Implement schema helper**

Create `ensure_test_access_codes_table(conn)` that creates `test_access_codes(code, user_id, status, created_at, claimed_at, updated_at)` and seeds demo codes idempotently.

- [ ] **Step 2: Implement `login_with_test_code(code)`**

Normalize the code, reject missing/disabled/unknown codes, return existing users when `user_id` is present, and create the next numeric user when an unused code has no `user_id`.

- [ ] **Step 3: Implement `complete_onboarding(user_id, payload)`**

Validate target score, level A-D, and book choices. Upsert `student_profiles` and `student_progress`, then return the same user payload plus `needsOnboarding: false`.

- [ ] **Step 4: Verify green**

Run: `.\.venv\Scripts\python.exe -m backend.test_flow`

Expected: PASS.

### Task 3: API Layer

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add request models**

Add `TestCodeRequest` and `OnboardingRequest`.

- [ ] **Step 2: Add endpoints**

Expose `POST /auth/test-code` and `POST /students/{user_id}/onboarding`, mapping service `ValueError` to HTTP 400.

### Task 4: Prototype UI

**Files:**
- Modify: `prototypes/student-mobile-v0.1/index.html`
- Modify: `prototypes/student-mobile-v0.1/assets/js/app.js`
- Modify: `prototypes/student-mobile-v0.1/styles/app.css`

- [ ] **Step 1: Replace the primary login path with test code entry**

Keep the old account/password form as a fallback, but make fixed test code the first path.

- [ ] **Step 2: Add onboarding panel**

If the backend says `needsOnboarding`, collect target score, A-D level, default primary books `880` and `1000`, and default backup book `660`.

- [ ] **Step 3: Load the daily plan after onboarding**

Reuse existing `loadStudentPlan(user)` so the rest of the app remains unchanged.

### Task 5: Final Verification

**Files:**
- No additional files.

- [ ] **Step 1: Run backend flow**

Run: `.\.venv\Scripts\python.exe -m backend.test_flow`

Expected: PASS.

- [ ] **Step 2: Start API server**

Run: approved uvicorn startup command.

Expected: `/health` returns `{"status":"ok"}`.
