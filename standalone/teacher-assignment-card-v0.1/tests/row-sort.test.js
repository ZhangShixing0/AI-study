const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createElement() {
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    closest() {
      return { classList: { toggle() {} } };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

const elements = new Map();
[
  "#chapterSelect",
  "#levelSelect",
  "#typeSearch",
  "#typeSelect0",
  "#typeSelect1",
  "#typeSelect2",
  "#duration0",
  "#duration1",
  "#duration2",
  "#bookSelect0",
  "#bookSelect1",
  "#bookSelect2",
  "#stageSelect0",
  "#stageSelect1",
  "#stageSelect2",
  "#totalDuration",
  "#styleList",
  "#taskCard",
  "#taskMeta",
  "#teacherReminderContent",
  "#printBtn",
  "#copyTextBtn",
  "#copyReminderBtn",
  "#exportPngBtn",
  "#toast",
].forEach((selector) => elements.set(selector, createElement()));

const windowObject = {
  TEACHER_ASSIGNMENT_DATA: {
    chapters: [{ chapterId: "CH1", chapterName: "测试章", sortOrder: 1 }],
    books: [{ bookId: "m2_880", bookName: "测试书", legacyCode: "A", sortOrder: 1 }],
    questionTypes: [
      {
        typeId: "T1",
        chapterId: "CH1",
        cardTitle: "测试题型",
        sortCode: "01-001",
        chapterSort: 1,
        duration100Days: 1,
      },
    ],
    questions: [
      {
        questionId: "q1",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 1,
        sourceChapterLabel: "第七章",
        sourceSectionLabel: "基础",
        sourceSubsectionLabel: "解答",
        sourceQuestionLabel: "第1题",
        applicableLevels: "A,B,C,D",
      },
      {
        questionId: "q2",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 2,
        sourceChapterLabel: "第七章",
        sourceSectionLabel: "综合",
        sourceSubsectionLabel: "解答",
        sourceQuestionLabel: "第2题",
        applicableLevels: "A,B,C,D",
      },
      {
        questionId: "q3",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 3,
        sourceChapterLabel: "第七章",
        sourceSectionLabel: "基础",
        sourceSubsectionLabel: "选择",
        sourceQuestionLabel: "第3题",
        applicableLevels: "A,B,C,D",
      },
      {
        questionId: "q4",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 4,
        sourceChapterLabel: "第七章",
        sourceSectionLabel: "综合",
        sourceSubsectionLabel: "填空",
        sourceQuestionLabel: "第4题",
        applicableLevels: "A,B,C,D",
      },
      {
        questionId: "q5",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 5,
        sourceChapterLabel: "第八章",
        sourceSectionLabel: "基础",
        sourceSubsectionLabel: "选择",
        sourceQuestionLabel: "第5题",
        applicableLevels: "A,B,C,D",
      },
      {
        questionId: "q6",
        typeId: "T1",
        bookId: "m2_880",
        bookSort: 1,
        questionOrder: 6,
        sourceChapterLabel: "第七章",
        sourceSectionLabel: "拓展",
        sourceSubsectionLabel: "选择",
        sourceQuestionLabel: "第6题",
        applicableLevels: "A,B,C,D",
      },
    ],
  },
  clearTimeout() {},
  setTimeout() {},
  print() {},
};

const documentObject = {
  querySelector(selector) {
    return elements.get(selector) || createElement();
  },
  querySelectorAll() {
    return [];
  },
  createElement() {
    return createElement();
  },
  body: { appendChild() {} },
};

const context = {
  window: windowObject,
  document: documentObject,
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  console,
  XMLSerializer: function XMLSerializer() {},
  Blob: function Blob() {},
  URL: { createObjectURL: () => "", revokeObjectURL() {} },
  Image: function Image() {},
};
context.globalThis = context;

const appPath = path.join(__dirname, "..", "app.js");
vm.runInNewContext(fs.readFileSync(appPath, "utf8"), context, { filename: appPath });

const html = elements.get("#taskCard").innerHTML;
const titles = [...html.matchAll(/<div class="task-row-title">([^<]+)<\/div>/g)].map((match) =>
  match[1].replace(/&amp;/g, "&"),
).filter((title) => title !== "当前组合暂无题目");

assert.deepStrictEqual(titles, [
  "第七章 · 基础 · 选择",
  "第七章 · 基础 · 解答",
  "第七章 · 综合 · 填空",
  "第七章 · 综合 · 解答",
  "第七章 · 拓展 · 选择",
  "第八章 · 基础 · 选择",
]);

console.log("row-sort.test.js passed");
