const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  !source.includes('row.role === "student" ? tag(row.dataMode)'),
  "account overview should not expose the confusing dataMode column"
);

for (const status of [
  "active",
  "disabled",
  "deactivated",
  "expired_pending_review",
  "converted_to_formal",
  "archived",
  "deleted",
]) {
  assert.ok(
    source.includes(`["${status}",`),
    `account overview status filter should include ${status}`
  );
}

assert.ok(
  source.includes('data-student-field="dailyMathGoalHours"'),
  "student detail should expose daily math goal hours"
);
assert.ok(
  source.includes("dailyMathGoalHours: Number(studentFieldValue(\"dailyMathGoalHours\"))"),
  "student detail save payload should submit daily math goal hours"
);
assert.ok(
  source.includes("payload.dailyMathGoalHours"),
  "student save confirmation should show the edited daily math goal hours"
);

assert.ok(
  source.includes('fieldInput("') &&
    source.includes('"nickname"') &&
    source.includes("teacher?.nickname"),
  "teacher status modal should allow editing teacher nickname"
);
assert.ok(
  source.includes('nickname: modalValue("nickname")'),
  "teacher status update should submit the edited nickname"
);

console.log("admin account/student/teacher field contract ok");
