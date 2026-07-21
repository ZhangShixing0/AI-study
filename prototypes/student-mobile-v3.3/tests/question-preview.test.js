const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const profileSource = fs.readFileSync(path.join(root, "assets/js/pages/profile.js"), "utf8");
const planCssSource = fs.readFileSync(path.join(root, "styles/pages/plan.css"), "utf8");
const previewCssSource = fs.readFileSync(path.join(root, "styles/pages/question-preview.css"), "utf8");
const previewPath = path.join(root, "assets/js/pages/question-preview.js");

assert.match(
  profileSource,
  /data-question-preview-open/,
  "the preparation config card should expose the question preview entry"
);
assert.match(
  profileSource,
  /data-question-preview-open>[\s\S]*?configIconHtml\("profile-config-workbook\.svg"\)[\s\S]*?预览全部题型题目/,
  "the preview entry should use the same workbook icon and row structure as the preparation config"
);
assert.match(indexSource, /id="questionPreviewView"/);
assert.match(indexSource, /styles\/pages\/question-preview\.css/);
assert.match(indexSource, /assets\/js\/pages\/question-preview\.js/);

assert.match(appSource, /\/students\/\$\{activeUser\.userId\}\/question-preview\/options/);
assert.match(appSource, /\/students\/\$\{activeUser\.userId\}\/question-preview\/types\/\$\{encodeURIComponent\(typeId\)\}/);
assert.match(appSource, /data-question-preview-chapter/);
assert.match(appSource, /data-question-preview-type/);
assert.match(
  appSource,
  /classList\.toggle\(\s*"question-preview-active",\s*viewId === "questionPreviewView"/,
  "the app shell should mark only the question preview view as navigation-free"
);
assert.match(
  appSource,
  /await apiRequest\(`\/students\/\$\{activeUser\.userId\}\/question-preview\/options`\)/,
  "preview options should use a plain read request"
);

assert.ok(fs.existsSync(previewPath), "the isolated question preview renderer should exist");
const previewSource = fs.readFileSync(previewPath, "utf8");
assert.match(previewSource, /选择章节/);
assert.match(previewSource, /选择题型/);
assert.match(previewSource, /当前两本主练习册暂无该题型题目/);
assert.match(previewSource, /sourceGroups/);
assert.match(previewSource, /root\.renderTypeCard/);
assert.doesNotMatch(previewSource, /question-preview-type-card|question-preview-source-card|function renderSourceGroups/);
assert.doesNotMatch(previewSource, /提交反馈|做题反馈|今日做题清单/);
assert.match(
  planCssSource,
  /:is\(#planView, #questionPreviewView\) \.type-card/,
  "the existing daily-plan type card styles should also apply to the preview view"
);
assert.match(previewCssSource, /#appShell\.question-preview-active \.bottom-app-nav\s*\{\s*display: none;/);
assert.match(previewCssSource, /\.question-preview-field select\s*\{[\s\S]*appearance: none;/);
assert.match(previewCssSource, /\.question-preview-field::after/);
assert.match(previewCssSource, /\.question-preview-header\s*\{[\s\S]*border-bottom: 1px solid #bfe8e2;/);
assert.match(
  previewCssSource,
  /\.question-preview-entry\s*\{[\s\S]*margin: 0;[\s\S]*padding: 0;[\s\S]*appearance: none;/,
  "the profile entry should not retain native button spacing or appearance"
);

const previewView = { innerHTML: "" };
let renderedTypeCard = null;
global.document = {
  querySelector(selector) {
    return selector === "#questionPreviewView" ? previewView : null;
  },
};
global.renderTypeCard = (type) => {
  renderedTypeCard = type;
  return `<article class="type-card"><h3>${type.title}</h3></article>`;
};
require(previewPath);
const chapters = Array.from({ length: 15 }, (_, index) => ({
  chapterId: `M2-CH-${String(index + 1).padStart(4, "0")}`,
  chapterName: `正式章节${index + 1}`,
  types: index === 0
    ? [{ typeId: "M2-QT-0001", typeName: "函数极限概念辨析", displayTypeLabel: "题型1" }]
    : [],
}));
global.QuestionPreviewPage.render({
  status: "ready",
  options: {
    primaryBooks: [
      { bookCode: "880", bookLabel: "《880》", scope: "advanced" },
      { bookCode: "1000", bookLabel: "《1000》", scope: "basic" },
    ],
    chapters,
  },
  selectedChapterId: chapters[0].chapterId,
  selectedTypeId: "M2-QT-0001",
  detail: {
    type: { typeName: "函数极限概念辨析", displayTypeLabel: "题型1" },
    sourceGroups: [{
      sourceLabel: "《880》",
      entries: [
        { chapterLabel: "第一章", phaseLabel: "强化", questionTypeShort: "选择", numbers: ["第4题"] },
        { chapterLabel: "第一章", phaseLabel: "强化", questionTypeShort: "选择", numbers: ["第5题"] },
      ],
    }],
  },
});
assert.equal((previewView.innerHTML.match(/<option /g) || []).length, 16, "15 chapters and one type should render");
assert.match(previewView.innerHTML, /《880》/);
assert.match(previewView.innerHTML, /强化/);
assert.match(previewView.innerHTML, /class="type-card"/);
assert.equal(renderedTypeCard.title, "函数极限概念辨析");
assert.equal(renderedTypeCard.displayTypeLabel, "题型1");
assert.equal(renderedTypeCard.sourceGroups.length, 1);
assert.deepEqual(
  renderedTypeCard.sourceGroups[0].entries.flatMap((entry) => entry.numbers),
  ["第4题", "第5题"]
);
delete global.document;
delete global.renderTypeCard;

console.log("question preview contract ok");
