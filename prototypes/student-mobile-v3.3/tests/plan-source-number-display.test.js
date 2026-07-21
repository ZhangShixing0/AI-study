const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/plan.js"),
  "utf8"
);
const context = {
  TodayPlanSourceFormatting: require("../assets/js/source-formatting.js"),
  escapeHtml(value) {
    return String(value ?? "");
  },
};
vm.runInNewContext(source, context);

assert.equal(typeof context.renderSourceRows, "function");

const html = context.renderSourceRows({
  sourceGroups: [
    {
      sourceLabel: "《880》",
      entries: [
        {
          chapterLabel: "第二章",
          phaseLabel: "基础",
          questionTypeShort: "选择",
          numbers: ["第5题", "第6题", "第7题"],
        },
      ],
    },
  ],
});

assert.ok(html.includes(">5、</span>"));
assert.ok(html.includes(">6、</span>"));
assert.ok(html.includes(">7</span>"));
assert.ok(!html.includes("第5题"));
assert.ok(!html.includes("第6题"));
assert.ok(!html.includes("第7题"));

const fallbackHtml = context.renderSourceRows({
  sourceGroups: [
    {
      sourceLabel: "《880》",
      entries: [
        {
          numbers: ["《880》第1章基础一第4题", "《880》第1章基础一第5题"],
        },
      ],
    },
  ],
});

assert.ok(fallbackHtml.includes("第一章 · 基础"));
assert.ok(fallbackHtml.includes(">选择</span>"));
assert.ok(fallbackHtml.includes(">4、</span>"));
assert.ok(fallbackHtml.includes(">5</span>"));
assert.ok(!fallbackHtml.includes("《880》第1章基础一第4题"));
assert.ok(!fallbackHtml.includes("《880》第1章基础一第5题"));

const mergedChoiceHtml = context.renderSourceRows({
  sourceGroups: [
    {
      sourceLabel: "880",
      entries: [
        { chapterLabel: "chapter one", phaseLabel: "basic", questionTypeShort: "choice", numbers: ["4"] },
        { chapterLabel: "chapter one", phaseLabel: "basic", questionTypeShort: "choice", numbers: ["5"] },
        { chapterLabel: "chapter one", phaseLabel: "basic", questionTypeShort: "choice", numbers: ["10"] },
      ],
    },
  ],
});

assert.equal((mergedChoiceHtml.match(/source-task-row/g) || []).length, 1);
assert.ok(mergedChoiceHtml.includes(">4"));
assert.ok(mergedChoiceHtml.includes(">5"));
assert.ok(mergedChoiceHtml.includes(">10"));

const mergedPlainNumberHtml = context.renderSourceRows({
  sourceGroups: [
    {
      sourceLabel: "880",
      entries: [
        { chapterLabel: "chapter two", phaseLabel: "advanced", numbers: ["15"] },
        { chapterLabel: "chapter two", phaseLabel: "advanced", numbers: ["214"] },
        { chapterLabel: "chapter two", phaseLabel: "advanced", numbers: ["215"] },
      ],
    },
  ],
});

assert.equal((mergedPlainNumberHtml.match(/source-task-row/g) || []).length, 1);
assert.ok(mergedPlainNumberHtml.includes(">题号</span>"));
assert.ok(!mergedPlainNumberHtml.includes("题号："));
assert.ok(mergedPlainNumberHtml.includes(">15"));
assert.ok(mergedPlainNumberHtml.includes(">214"));
assert.ok(mergedPlainNumberHtml.includes(">215"));

assert.equal(typeof context.extraPracticeTypesFor, "function");
assert.deepEqual(
  context.extraPracticeTypesFor({
    types: [{ typeId: "M2-QT-0015", typeName: "test type" }],
    extraPracticeTypes: [],
  }),
  [],
  "explicit backend empty extra practice must not fall back to static 1000"
);

const explicitExtra = context.extraPracticeTypesFor({
  extraPracticeTypes: [
    {
      typeId: "M2-QT-0015",
      sourceGroups: [
        {
          sourceName: "660",
          sourceLabel: "660",
          entries: [{ numbers: ["254", "255"] }],
        },
      ],
      questions: [{ questionId: "q1", label: "660 q1", order: 1 }],
    },
  ],
});
assert.equal(explicitExtra[0].sourceGroups[0].sourceName, "660");

console.log("plan source number display ok");
