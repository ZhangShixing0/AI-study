const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const experienceSource = fs.readFileSync(path.join(root, "data/experience-data.js"), "utf8");

const context = { window: {} };
vm.runInNewContext(experienceSource, context);

const pool = JSON.parse(JSON.stringify(context.window.EXPERIENCE_DATA));
assert.equal(pool.length, 3, "experience data should keep three seed snapshots for maintenance");

const experienceB = pool.find((item) => item.id === "experience-b");
assert.ok(experienceB, "experience-b should exist");

assert.match(
  appSource,
  /return pool\.find\(\(item\) => item\.id === "experience-b"\) \|\| pool\[0\];/,
  "immediate experience should always enter experience-b instead of random accounts"
);

assert.match(
  appSource,
  /function completeExperienceFeedback\(/,
  "experience mode should have a local fake completion transition"
);

assert.match(
  appSource,
  /if \(isExperienceMode\) \{\s*return completeExperienceFeedback\(answers\);/s,
  "experience feedback should fake-submit locally without calling the backend"
);

const plan = experienceB.data.plan;
assert.equal(plan.rawStatus, "in_progress", "experience-b should start as a feedback flow");
assert.equal(plan.currentFeedbackTypeId, "M2-QT-0014");
assert.equal(plan.feedbackItems.length, 2, "experience-b should submit the two planned questions");

assert.equal(plan.types[0].typeId, "M2-QT-0014");
assert.equal(plan.types[0].title, "数列极限大题：结合函数性态、夹逼等");
assert.equal(plan.types[0].summary.title, "拔高 | 综合题：数列极限大题");
assert.deepEqual(plan.types[0].sourceGroups[0].entries[0].numbers, ["17"]);
assert.deepEqual(plan.types[0].sourceGroups[1].entries[0].numbers, ["11"]);

assert.equal(plan.types[1].typeId, "M2-QT-0015");
assert.equal(plan.types[1].title, "知识点：导数定义（左右导数）和可导");
assert.equal(plan.types[1].summary.title, "易错 | 概念题：左右导数可导");
const thousandEntries = plan.types[1].sourceGroups.find((group) => group.sourceLabel === "《1000》").entries;
assert.equal(thousandEntries[0].phaseLabel, "基础", "1000 basic questions should appear before 1000 intensive questions");
assert.equal(thousandEntries[1].phaseLabel, "强化");

const completion = plan.experienceCompletion;
assert.ok(completion, "experience-b should carry the fake submitted completed snapshot");
assert.equal(completion.rawStatus, "completed");
assert.ok(completion.chapterSummary, "fake completion should show the first chapter summary");
assert.equal(completion.chapterSummary.chapterName, "极限");
assert.equal(completion.extraPracticeTypes.length, 1, "only type two has 660 extra practice");
assert.equal(completion.extraPracticeTypes[0].typeId, "M2-QT-0015");
assert.deepEqual(
  completion.extraPracticeTypes[0].sourceGroups[0].entries[0].numbers,
  ["254", "255", "256", "257", "267", "268", "269", "270", "274", "282", "283", "284", "285", "289", "290"]
);
assert.ok(
  !completion.extraPracticeTypes.some((type) => type.typeId === "M2-QT-0014"),
  "type one should not appear in 660 extra practice because public seed has no 660 questions for it"
);

const reviewNotes = completion.reviewItems.map((item) => item.questionNote);
assert.ok(reviewNotes.includes("由f(0)=0构造拉格朗日中值"));
assert.ok(reviewNotes.includes("含绝对值的不可导点结论"));
assert.ok(reviewNotes.includes("等式脱帽得到f(x)"));
assert.ok(
  !reviewNotes.includes("右导数定义式+换元变为左导数"),
  "660 notes belong to extra practice and should not appear in today's review card"
);

console.log("experience mode fake submit flow ok");
