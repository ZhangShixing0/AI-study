const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  source.includes("/admin/chapter-options"),
  "admin console should load public chapter options"
);
assert.ok(
  source.includes("function chapterStartOptions"),
  "student detail should convert chapter options into select options"
);
assert.ok(
  source.includes('"nextPlanStartChapterId"'),
  "student detail should render the chapter-level plan start field"
);
assert.ok(
  source.includes("nextPlanStartChapterId: studentFieldValue(\"nextPlanStartChapterId\")"),
  "student save payload should submit nextPlanStartChapterId"
);
assert.ok(
  !source.includes('manualNextTypeId: studentFieldValue("manualNextTypeId")'),
  "student save payload should no longer submit manualNextTypeId"
);

console.log("admin chapter start binding ok");
