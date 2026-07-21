const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/plan.js"),
  "utf8"
);
const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

assert.ok(
  indexHtml.includes("assets/js/pages/plan.js?v=32"),
  "student index should use the current chapter-summary cache key"
);

const planView = { innerHTML: "" };
const context = {
  document: {
    querySelector(selector) {
      return selector === "#planView" ? planView : null;
    },
  },
  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  },
};

vm.runInNewContext(source, context);

assert.equal(typeof context.renderPlan, "function");

context.renderPlan({
  student: { name: "student" },
  plan: {
    date: "2026-06-28",
    rawStatus: "in_progress",
    status: "in progress",
    daysToExam: 174,
    totalTypes: 1,
    types: [],
    feedbackItems: [],
    feedbacks: [],
    chapterSummary: {
      chapterName: "Limit",
      summaryTitle: "Limit chapter summary",
      accuracyRate: "0.8",
      spentDays: "3",
      mainLossReasons: ["calculation mistakes", "method selection"],
      reviewTypeNames: ["SHOULD_NOT_RENDER"],
      examFocus: "PUBLIC EXAM FOCUS FROM TEMPLATE",
      keyPoints: "PUBLIC KEY POINTS FROM TEMPLATE",
      commonMistakes: "PUBLIC COMMON MISTAKES FROM TEMPLATE",
      reviewAdvice: "PUBLIC REVIEW SUGGESTIONS FROM TEMPLATE",
    },
  },
});

assert.ok(
  !planView.innerHTML.includes("chapter-summary-card"),
  "in-progress plans should not render chapterSummary before all daily feedback is completed"
);

context.renderPlan({
  student: { name: "student" },
  plan: {
    date: "2026-06-28",
    rawStatus: "completed",
    status: "completed",
    daysToExam: 174,
    totalTypes: 1,
    types: [],
    feedbackItems: [],
    feedbacks: [],
    completedMessage: "done",
    chapterSummary: {
      chapterName: "Limit",
      summaryTitle: "Limit chapter summary",
      accuracyRate: "0.8",
      spentDays: "3",
      mainLossReasons: ["calculation mistakes", "method selection"],
      reviewTypeNames: ["SHOULD_NOT_RENDER"],
      examFocus: "PUBLIC EXAM FOCUS FROM TEMPLATE",
      keyPoints: "PUBLIC KEY POINTS FROM TEMPLATE",
      commonMistakes: "PUBLIC COMMON MISTAKES FROM TEMPLATE",
      reviewAdvice: "PUBLIC REVIEW SUGGESTIONS FROM TEMPLATE",
    },
  },
});

assert.ok(
  planView.innerHTML.includes("chapter-summary-card"),
  "completed plans should render chapterSummary below the completion card"
);
assert.ok(
  planView.innerHTML.indexOf("completion-card") < planView.innerHTML.indexOf("chapter-summary-card"),
  "chapterSummary should appear after the daily completion card"
);
assert.ok(
  !planView.innerHTML.includes("SHOULD_NOT_RENDER"),
  "chapterSummary should not render suggested review type names"
);
assert.ok(
  planView.innerHTML.includes("calculation mistakes") &&
    planView.innerHTML.includes("method selection"),
  "chapterSummary should render the two main loss reasons"
);
assert.ok(
  planView.innerHTML.includes("chapter-summary-metric is-wide"),
  "chapterSummary loss reason metric should span the full row after removing review types"
);
assert.ok(
  planView.innerHTML.includes("PUBLIC EXAM FOCUS FROM TEMPLATE") &&
    planView.innerHTML.includes("PUBLIC KEY POINTS FROM TEMPLATE") &&
    planView.innerHTML.includes("PUBLIC COMMON MISTAKES FROM TEMPLATE") &&
    planView.innerHTML.includes("PUBLIC REVIEW SUGGESTIONS FROM TEMPLATE"),
  "chapterSummary should render public template fields"
);

console.log("plan chapter summary completion-only rendering ok");
