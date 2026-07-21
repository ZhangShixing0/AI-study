const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/profile.js"),
  "utf8"
);
const context = {};
vm.runInNewContext(source, context);

assert.equal(typeof context.getProfileSubmissionState, "function");

const stateOf = (plan) => JSON.parse(JSON.stringify(context.getProfileSubmissionState(plan)));

const makePlan = (statuses) => ({
  types: statuses.map((feedbackStatus, index) => ({
    typeId: `T${index + 1}`,
    feedbackStatus,
  })),
  feedbacks: statuses
    .map((feedbackStatus, index) => feedbackStatus === "submitted" ? { typeId: `T${index + 1}` } : null)
    .filter(Boolean),
});

assert.deepEqual(
  stateOf(makePlan(["open", "locked", "locked"])),
  {
    key: "pending",
    status: "待反馈",
    stateClass: "is-pending",
    icon: "assets/icons/profile-status-homework.svg",
    showCta: true,
    submittedCount: 0,
    totalCount: 3,
  }
);

assert.deepEqual(
  stateOf(makePlan(["submitted", "open", "locked"])),
  {
    key: "in-progress",
    status: "进行中",
    stateClass: "is-progress",
    icon: "assets/icons/profile-status-homework-done.svg",
    showCta: true,
    submittedCount: 1,
    totalCount: 3,
  }
);

assert.deepEqual(
  stateOf(makePlan(["submitted", "submitted", "submitted"])),
  {
    key: "completed",
    status: "已完成",
    stateClass: "is-completed",
    icon: "assets/icons/profile-status-homework-done.svg",
    showCta: false,
    submittedCount: 3,
    totalCount: 3,
  }
);

console.log("profile submission state ok");
