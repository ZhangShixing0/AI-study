const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/app.js"),
  "utf8"
);

const loadStart = source.indexOf("async function loadStudentPlan");
const loginStart = source.indexOf("async function loginAndLoadPlan", loadStart);
const submitStart = source.indexOf("async function submitFeedbackAnswers");
const polarStart = source.indexOf("function polarToCartesian", submitStart);
const showViewStart = source.indexOf("function showView");
const navStart = source.indexOf("navButtons.forEach((button)", showViewStart);

assert.ok(loadStart > -1 && loginStart > loadStart, "loadStudentPlan should be present");
assert.ok(submitStart > -1 && polarStart > submitStart, "submitFeedbackAnswers should be present");
assert.ok(showViewStart > -1 && navStart > showViewStart, "showView should be present");

const loadBlock = source.slice(loadStart, loginStart);
const submitBlock = source.slice(submitStart, polarStart);
const showViewBlock = source.slice(showViewStart, navStart);

assert.match(
  source,
  /async function refreshCurveData\(/,
  "growth page should have a dedicated curve refresh helper"
);
assert.match(
  source,
  /async function refreshStudyRoomData\(/,
  "study room page should have a dedicated refresh helper"
);
assert.match(
  source,
  /async function refreshProfileData\(/,
  "profile page should have a dedicated refresh helper"
);
assert.match(
  loadBlock,
  /const apiPlan = await apiRequest\(`\/students\/\$\{user\.userId\}\/daily-plan\?date=\$\{activePlanDate\}`\)/,
  "daily plan should load before optional page data"
);
assert.doesNotMatch(
  loadBlock,
  /Promise\.all\(\[\s*apiRequest\(`\/students\/\$\{user\.userId\}\/daily-plan/,
  "daily plan should not be blocked by rankings, curve, study room, profile, or notifications"
);
assert.match(
  loadBlock,
  /refreshSupplementalStudentData\(\)/,
  "optional page data should be refreshed after the plan shell is available"
);
assert.match(
  submitBlock,
  /await refreshSupplementalStudentData\(\)/,
  "feedback submit should refresh optional pages through the tolerant helper"
);
assert.doesNotMatch(
  submitBlock,
  /activeRankings = await apiRequest\(`\/students\/\$\{activeUser\.userId\}\/rankings/,
  "feedback submit should not fail because a supplemental page endpoint fails"
);
assert.match(
  showViewBlock,
  /if \(viewId === "curveView"\) \{\s+refreshCurveData\(\);/,
  "opening growth page should refresh curve data"
);
assert.match(
  showViewBlock,
  /if \(viewId === "myView"\) \{\s+refreshProfileData\(\);/,
  "opening my page should refresh profile data"
);

console.log("student page data refresh contract ok");
