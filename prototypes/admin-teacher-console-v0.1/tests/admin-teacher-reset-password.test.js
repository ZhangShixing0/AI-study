const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  source.includes("function renderTeacherResetPasswordResult"),
  "teacher management should have a reset password result renderer"
);

assert.ok(
  source.includes("${renderTeacherResetPasswordResult()}"),
  "teacher reset password result should be visible on the teacher management page"
);

assert.ok(
  source.includes('actionKey === "reset_teacher_password"') && source.includes("老师管理页"),
  "teacher reset password toast should point to the teacher management page, not a missing detail page"
);

console.log("admin teacher reset password display contract ok");
