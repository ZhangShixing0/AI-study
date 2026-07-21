const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/curve.js"),
  "utf8"
);
const context = {};
context.window = context;
vm.runInNewContext(source, context);

assert.equal(typeof context.buildGroupedMastery, "function");

const grouped = context.buildGroupedMastery([
  {
    chapterId: "math2-limit",
    name: "极限",
    rate: 25,
    submittedQuestionCount: 4,
    wrongQuestionCount: 1,
    correctQuestionCount: 2,
    totalQuestionCount: 8,
  },
]);

const limit = grouped.find((row) => row.groupId === "math2-limit");
assert.equal(limit.rate, 25);
assert.equal(limit.submittedQuestionCount, 4);
assert.equal(limit.correctQuestionCount, 2);
assert.equal(limit.totalQuestionCount, 8);

console.log("curve mastery mapping ok");
