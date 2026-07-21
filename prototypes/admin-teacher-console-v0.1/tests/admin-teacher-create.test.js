const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  source.includes("teacherCreationResult"),
  "admin console should keep the latest created teacher credential in page state"
);
assert.ok(
  source.includes("function renderTeacherCreationResult"),
  "teacher page should render the created teacher account and initial password"
);
assert.ok(
  source.includes('data-copy-teacher-password'),
  "teacher creation result should expose a copy-password control"
);
assert.ok(
  source.includes("initialPassword: data.initialPassword"),
  "teacher creation action should store the backend returned initialPassword"
);
assert.ok(
  source.includes("upsertTeacher(data.teacher"),
  "teacher creation action should merge the backend returned teacher into DATA.teachers"
);
assert.ok(
  source.includes('showToast("老师账号已创建，初始密码已显示在老师管理页")'),
  "teacher creation should show an explicit success message"
);

console.log("admin teacher create contract ok");
