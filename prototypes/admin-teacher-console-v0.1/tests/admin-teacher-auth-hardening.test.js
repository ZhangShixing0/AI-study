const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

assert.ok(
  appSource.includes('data-auth-action="toggle-password"') &&
    appSource.includes("toggleBackofficePasswordVisibility"),
  "backoffice login should provide a show/hide password button"
);

assert.ok(
  dataSource.includes('["teacherPassword", "修改信息"]'),
  "teacher navigation should expose a profile info page"
);

assert.ok(
  appSource.includes("function renderTeacherPassword") &&
    appSource.includes("/teacher/password") &&
    appSource.includes("currentPassword") &&
    appSource.includes("confirmPassword"),
  "teacher console should render and submit a real change-password form"
);

assert.ok(
  appSource.includes("function loadTeacherConsoleDataIfNeeded") &&
    appSource.includes('adminApiRequest("/teacher/classes")') &&
    appSource.includes('/teacher/classes/${apiSegment(item.classId)}/daily-feedback-status'),
  "real teacher login should load classes and students from teacher-scoped backend APIs"
);

assert.ok(
  appSource.includes("function authenticatedTeacherUserId") &&
    appSource.includes("state.authSession?.user?.userId"),
  "teacher pages should derive the active teacher from the authenticated session"
);

assert.ok(
  appSource.includes("/admin/risk-authorizations/verify") &&
    appSource.includes("riskAuthorizedUntil") &&
    !appSource.includes("function verifyTotpCode(code)"),
  "high-risk TOTP authorization should be verified by the backend instead of a local six-digit check"
);

assert.ok(
  appSource.includes('riskLevel: "high"') &&
    appSource.includes("DATA.actionFlows.add_teacher") &&
    appSource.includes("DATA.actionFlows.assign_teacher_class"),
  "teacher management write actions should be marked as high-risk before opening their modal"
);

assert.ok(
  indexHtml.includes("app.js?v=11"),
  "admin console cache key should be bumped for teacher auth hardening"
);

console.log("admin teacher auth hardening contract ok");
