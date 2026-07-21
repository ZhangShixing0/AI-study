const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");

const teacherNavBlock = dataSource.match(/teacher:\s*\[([\s\S]*?)\n\s*\]/)?.[1] || "";

for (const token of [
  '["teacherToday", "今日提醒"]',
  '["teacherLookup", "学生信息"]',
  '["teacherClasses", "我的班级"]',
]) {
  assert.ok(teacherNavBlock.includes(token), `teacher nav should include ${token}`);
}

for (const token of [
  "teacherRules",
  '["data", "数据字典"]',
  '["landing", "落地步骤"]',
]) {
  assert.ok(!teacherNavBlock.includes(token), `teacher nav should not include ${token}`);
}

for (const token of [
  "teacherInfoFilters",
  "teacherScopedStudents()",
  "teacherStudentsForInfoFilters()",
  "teacherStudentServiceStatus(student)",
  'data-teacher-info-filter="classId"',
  'data-teacher-info-filter="feedbackStatus"',
  'data-teacher-info-filter="studentStatus"',
  "studentStatusOptions",
  "dueSoon",
  "expired",
  "accountAbnormal",
]) {
  assert.ok(appSource.includes(token), `student info filters should include ${token}`);
}

assert.ok(
  !appSource.includes('id="lookupInput"'),
  "student info page should not render its own search input because the header search is the single search entry"
);

assert.match(
  appSource,
  /if\s*\(state\.role === "teacher"\)[\s\S]*teacherScopedStudents\(\)[\s\S]*kind:\s*"student"/,
  "teacher global search should only return scoped student results"
);

assert.match(
  appSource,
  /if\s*\(kind === "student" && state\.role === "teacher"\)[\s\S]*state\.view = "teacherLookup"/,
  "opening a teacher search student result should land on teacher student info"
);

console.log("teacher student info filters contract ok");
