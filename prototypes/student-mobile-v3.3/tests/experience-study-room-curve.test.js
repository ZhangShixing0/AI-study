const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const curveSource = fs.readFileSync(path.join(root, "assets/js/pages/curve.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const experienceSource = fs.readFileSync(path.join(root, "data/experience-data.js"), "utf8");

const context = { window: {} };
vm.runInNewContext(experienceSource, context);

const experienceB = context.window.EXPERIENCE_DATA.find((item) => item.id === "experience-b");
assert.ok(experienceB, "experience-b should exist");
assert.equal(
  context.window.EXPERIENCE_DATA_VERSION,
  "2026-06-30-experience-studyroom-curve",
  "experience data version should change when immediate-experience visuals change"
);
assert.ok(indexHtml.includes("data/experience-data.js?v=4"), "student index should bump experience data cache key");
assert.ok(indexHtml.includes("assets/js/app.js?v=46"), "student index should use the release app cache key");
assert.ok(indexHtml.includes("assets/js/pages/curve.js?v=27"), "student index should keep curve page cache key when only experience data changes");

const refreshStudyRoomDefinitions = appSource.match(/async function refreshStudyRoomData/g) || [];
assert.equal(
  refreshStudyRoomDefinitions.length,
  1,
  "study room refresh should have a single implementation so the experience-mode guard is not shadowed"
);

assert.match(
  appSource,
  /async function refreshStudyRoomData\(\) \{[\s\S]*if \(!canRefreshStudentPageData\(\)\) return null;/,
  "study room refresh should skip backend requests in experience mode"
);

const room = experienceB.data.studyRoom;
assert.ok(room, "immediate experience should include study room data");
assert.ok(Array.isArray(room.members) && room.members.length >= 4, "experience study room should render four companions");

const mastery = experienceB.data.curve.mastery;
assert.ok(Array.isArray(mastery) && mastery.length >= 12, "experience curve should cover all displayed math2 mastery groups");
for (const row of mastery) {
  assert.match(row.chapterId, /^math2-/, "experience mastery should use displayed chapter group IDs");
  assert.ok(Number(row.rate) > 0, "experience mastery rows should not render as 0%");
  assert.ok(Number(row.submittedQuestionCount) > 0, "experience mastery rows should look started");
}

const curveContext = {};
curveContext.window = curveContext;
vm.runInNewContext(curveSource, curveContext);
const groupedMastery = curveContext.buildGroupedMastery(mastery);
assert.ok(groupedMastery.length >= 12, "experience mastery should map into displayed chapter groups");
assert.ok(
  groupedMastery.every((row) => Number(row.rate) > 0),
  "experience mastery group cards should not render as 0%"
);

console.log("experience study room and curve contract ok");
