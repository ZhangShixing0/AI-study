const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");

assert.ok(
  dataSource.includes('["teacherPassword", "修改信息"]'),
  "teacher navigation should label the account page as 修改信息"
);

assert.ok(
  appSource.includes("function renderTeacherPassword") &&
    appSource.includes('setViewTitle("修改信息")') &&
    appSource.includes(">修改密码<"),
  "teacher info page should keep the password-change section under the 修改信息 page"
);

assert.ok(
  appSource.includes("teacherProfileForm") &&
    appSource.includes('data-teacher-profile-field="contactQQ"') &&
    appSource.includes("data-teacher-profile-save") &&
    appSource.includes('adminApiRequest("/teacher/profile"'),
  "teacher info page should submit a real contact QQ update form"
);

console.log("teacher profile info contract ok");
