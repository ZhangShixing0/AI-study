import fs from "node:fs";
import path from "node:path";

global.window = {};
await import("../prototypes/student-mobile-v0.1/data/app-data.js");

const elements = {};
function makeElement() {
  return {
    innerHTML: "",
    hidden: false,
    dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    querySelector() {
      return makeElement();
    },
    querySelectorAll() {
      return [];
    },
  };
}

global.document = {
  querySelector(selector) {
    if (!elements[selector]) elements[selector] = makeElement();
    return elements[selector];
  },
  querySelectorAll(selector) {
    if (selector === ".nav-item") {
      return ["planView", "rankView", "curveView", "studyRoomView", "myView"].map((view) => ({
        dataset: { view },
        classList: { toggle() {} },
        addEventListener() {},
      }));
    }
    if (selector === ".view") return [makeElement(), makeElement(), makeElement(), makeElement(), makeElement()];
    return [];
  },
  addEventListener() {},
};

global.URLSearchParams = class {
  get() {
    return null;
  }
};
global.window.location = { search: "" };
global.window.scrollTo = function scrollTo() {};

const prototypeRoot = "prototypes/student-mobile-v0.1";
const html = fs.readFileSync(path.join(prototypeRoot, "index.html"), "utf8");

if (!html.includes('href="styles/app.css"')) {
  throw new Error("Prototype shell should load extracted styles/app.css.");
}
if (/<style>[\s\S]*<\/style>/.test(html)) {
  throw new Error("Prototype shell should not keep the large inline style block.");
}
if (!html.includes('src="assets/js/app.js"')) {
  throw new Error("Prototype shell should load extracted assets/js/app.js.");
}
const pageModules = ["plan", "rank", "curve", "study-room", "profile"].map(
  (name) => `assets/js/pages/${name}.js`,
);
for (const modulePath of pageModules) {
  if (!html.includes(`src="${modulePath}"`)) {
    throw new Error(`Prototype shell should load page module ${modulePath}.`);
  }
  if (!fs.existsSync(path.join(prototypeRoot, modulePath))) {
    throw new Error(`Missing page module file: ${modulePath}.`);
  }
}

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const externalScripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map((match) => match[1])
  .filter((scriptPath) => scriptPath !== "data/app-data.js")
  .map((scriptPath) => fs.readFileSync(path.join(prototypeRoot, scriptPath), "utf8"));
const prototypeScripts = [...inlineScripts, ...externalScripts].join("\n\n");
new Function(`${prototypeScripts}
if (typeof buildLossDonutSvg === "function") globalThis.__buildLossDonutSvg = buildLossDonutSvg;
if (typeof displayTaskName === "function") globalThis.__displayTaskName = displayTaskName;
if (typeof renderFocusSessionPage === "function") {
  globalThis.__makeFocusHtmlWithSession = (session, room) => {
    activeFocusSession = session;
    return renderFocusSessionPage(room);
  };
}`)();

const data = window.APP_DATA;
const summary = {
  planTypes: data.plan.types.length,
  feedbackItems: data.plan.feedbackItems.length,
  rankRows: data.rank.rows.length,
  activityDays: data.curve.activity.length,
  masteryRows: data.curve.mastery.length,
  lossReasons: data.curve.lossReasons.length,
  studyRoomMembers: data.studyRoom.members.length,
  renderedViews: Object.keys(elements).filter((key) => key.endsWith("View")),
};

const curveHtml = elements["#curveView"].innerHTML;
if (!curveHtml.includes("loss-donut-chart")) {
  throw new Error("Curve page should render the loss reason chart as an SVG donut.");
}
if (!curveHtml.includes("loss-slice-label")) {
  throw new Error("Loss reason percentages should be rendered on or near chart slices.");
}
if (curveHtml.includes("loss-leader")) {
  throw new Error("Small loss reason slices should not render leader lines.");
}
if (!curveHtml.includes("loss-legend-bottom")) {
  throw new Error("Loss reason legend should be displayed below the donut chart.");
}
if (!curveHtml.includes("mastery-scroll")) {
  throw new Error("Chapter mastery list should use a scrollable right-side panel.");
}
if (data.curve.mastery.length !== 15) {
  throw new Error(`Expected 15 chapter mastery rows, got ${data.curve.mastery.length}.`);
}
const smallSliceSvg = globalThis.__buildLossDonutSvg(
  [
    { name: "A", rate: 54 },
    { name: "B", rate: 27 },
    { name: "C", rate: 11 },
    { name: "D", rate: 8 },
  ],
  ["#13bfa8", "#42b977", "#ffa726", "#7e70f2"],
);
if (smallSliceSvg.includes("11%") || smallSliceSvg.includes("8%")) {
  throw new Error("Loss reason slices below 12% should not display percentage labels.");
}
if (smallSliceSvg.includes("loss-leader")) {
  throw new Error("Loss reason slices below 12% should not render leader lines.");
}
const zeroSliceSvg = globalThis.__buildLossDonutSvg(
  [
    { name: "A", rate: 0 },
    { name: "B", rate: 0 },
    { name: "C", rate: 0 },
    { name: "D", rate: 0 },
  ],
  ["#13bfa8", "#42b977", "#ffa726", "#7e70f2"],
);
if (!zeroSliceSvg.includes("#e5eaee")) {
  throw new Error("All-zero loss reason chart should render a neutral gray donut.");
}
const studyRoomHtml = elements["#studyRoomView"].innerHTML;
if (studyRoomHtml.includes("data-target-hours")) {
  throw new Error("Study room target hours number should use the same large font format as completed hours.");
}
if (!studyRoomHtml.includes("focus-duration-options")) {
  throw new Error("Study room should render focus duration choices.");
}
if (studyRoomHtml.includes("data-target-step") || studyRoomHtml.includes("target-stepper")) {
  throw new Error("Study room should not expose plus/minus controls for daily math target.");
}
if (!studyRoomHtml.includes("task-picker")) {
  throw new Error("Study room should render a current-task picker.");
}
if (!studyRoomHtml.includes("task-card-pager")) {
  throw new Error("Current-task picker should use the fresh card pager design.");
}
if (!studyRoomHtml.includes("data-task-prev") || !studyRoomHtml.includes("data-task-next")) {
  throw new Error("Task card pager should expose previous/next controls.");
}
if (!studyRoomHtml.includes("focus-session-page")) {
  throw new Error("Study room should include the immersive focus session page.");
}
if (!studyRoomHtml.includes("退出专注")) {
  throw new Error("Focus session page should include an exit focus action.");
}
if (globalThis.__displayTaskName("函数极限概念辨析（注意复合函数极限）") !== "函数极限概念辨析") {
  throw new Error("Task display name should remove parenthesized notes.");
}
const focusHtml60 = globalThis.__makeFocusHtmlWithSession(
  { targetMinutes: 60, taskName: "函数极限概念辨析", startedAtMs: Date.now(), paused: false },
  { focusMinutes: 45, currentTaskName: "旧任务", roomName: "数学二冲刺自习室", onlineCount: 128 },
);
if (!focusHtml60.includes("本轮专注目标 <strong>60</strong> 分钟")) {
  throw new Error("Focus session page should render the selected focus duration, not the stale room duration.");
}
if (data.curve.activity.at(-1).rawDate === "2026-06-10") {
  throw new Error("14-day heatmap should exclude the current day.");
}
const myHtml = elements["#myView"]?.innerHTML || "";
if (!myHtml.includes("profile-hero")) {
  throw new Error("My page should render the profile hero.");
}
if (!myHtml.includes("我的备考配置")) {
  throw new Error("My page should render exam configuration.");
}
if (!myHtml.includes("school-search-modal")) {
  throw new Error("My page should include target-school search modal.");
}
for (const removedText of ["打卡日历", "本周完成率", "最近学习概览", "编辑资料", "调整目标", "更换习题册"]) {
  if (myHtml.includes(removedText)) {
    throw new Error(`My page should not render removed module text: ${removedText}`);
  }
}

console.log(JSON.stringify(summary, null, 2));
