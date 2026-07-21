const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(
  path.join(__dirname, "../assets/js/app.js"),
  "utf8"
);
assert.match(appSource, /cardLabel:\s*type\.displayTypeLabel/);
assert.match(appSource, /cardTypeLabel:\s*type\.displayTypeLabel/);

const planSource = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/plan.js"),
  "utf8"
);
const context = {
  TodayPlanSourceFormatting: require("../assets/js/source-formatting.js"),
  escapeHtml(value) {
    return String(value ?? "");
  },
};
vm.runInNewContext(planSource, context);

const cardTypeLabel = "\u9898\u578b8";
const html = context.renderTypeCard({
  index: 1,
  cardTypeLabel,
  title: "Taylor expansion",
  theme: "green",
  summary: { title: "Core", body: "Body" },
  sourceGroups: [],
  sources: [],
});

assert.ok(html.includes(cardTypeLabel));
assert.ok(!html.includes("\u9898\u578b 1"));

const displayLabelHtml = context.renderTypeCard({
  index: 4,
  displayTypeLabel: "\u9898\u578b2",
  cardTypeLabel: "\u9898\u578b4",
  title: "Skipped public type",
  theme: "green",
  summary: { title: "Core", body: "Body" },
  sourceGroups: [],
  sources: [],
});

assert.ok(displayLabelHtml.includes("\u9898\u578b2"));
assert.ok(!displayLabelHtml.includes("\u9898\u578b4"));

console.log("plan card type label ok");
