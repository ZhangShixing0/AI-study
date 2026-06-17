import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const versionDir = path.join(root, "prototypes", "student-mobile-v1.1");
const failures = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(fs.existsSync(versionDir), "student-mobile-v1.1 folder should exist");

const index = read("prototypes/student-mobile-v1.1/index.html");
const profile = read("prototypes/student-mobile-v1.1/assets/js/pages/profile.js");
const app = read("prototypes/student-mobile-v1.1/assets/js/app.js");
const css = read("prototypes/student-mobile-v1.1/styles/app.css");
const backend = read("backend/main.py");

for (const label of ["今日计划", "成长", "自习室", "我的"]) {
  expect(index.includes(label), `Bottom navigation should include ${label}`);
}

expect(!index.includes('data-view="rankView"'), "Rank should not be a primary navigation item");
expect(index.includes('data-view="curveView"') && index.includes("成长"), "Curve view should be renamed to 成长 in nav");
expect(css.includes("bottom-app-nav"), "v1.1 should define bottom-app-nav styling");
expect(css.includes("mobile-shell"), "v1.1 should define a phone-friendly mobile shell");
expect(app.includes("renderProfile(activeProfile, activeRankings)"), "Profile renderer should receive rankings data");
expect(app.includes("data-jump-view"), "Profile actions should be able to jump to full ranking view");
expect(!app.includes("`《${source.source}》 ${source.items.join"), "Plan sources should not wrap source names twice");
expect(app.includes("let activePlanDate"), "App should track an active test plan date");
expect(app.includes("data-load-next-test-day"), "Completed plan should expose the beta next-day test action");
expect(css.includes("repeat(3, 48px)") || css.includes("repeat(3, 50px)"), "Mobile feedback choices should stay on the same row");

for (const text of ["今日状态", "我的勋章", "下一枚勋章目标", "查看完整排行", "我的备考配置"]) {
  expect(profile.includes(text), `Profile page should include ${text}`);
}

expect(backend.includes('student-mobile-v1.1'), "Backend should serve student-mobile-v1.1 by default");

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("student-mobile-v1.1 verification passed");
