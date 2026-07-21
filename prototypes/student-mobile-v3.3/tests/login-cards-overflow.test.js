const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");

const blockFor = (selector) => {
  let start = -1;
  while (true) {
    start = css.indexOf(selector, start + 1);
    assert.notEqual(start, -1, `${selector} should exist`);
    if (css.slice(start + selector.length).trimStart().startsWith("{")) break;
  }
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`${selector} block is not closed`);
};

for (const text of [
  "会听不会做",
  "不会总结错因",
  "复盘总是拖延",
  "做题",
  "按计划练",
  "反馈",
  "及时看问题",
  "复盘",
  "找出错因",
  "定位",
  "生成报告",
]) {
  assert.ok(html.includes(text), `${text} should be rendered`);
}

for (const oldText of ["错了不知道原因", "定位薄弱点", "生成短板报告"]) {
  assert.ok(!html.includes(oldText), `${oldText} should be replaced`);
}

assert.match(blockFor(".login-pain-card"), /overflow:\s*hidden;/);
assert.match(blockFor(".login-pain-card"), /padding-inline:\s*clamp\(10px,\s*3\.6vw,\s*14px\);/);
assert.match(blockFor(".login-pain-grid"), /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
assert.match(blockFor(".login-pain-item"), /overflow:\s*hidden;/);
assert.match(blockFor(".login-pain-item p"), /font-size:\s*clamp\(12px,\s*3\.45vw,\s*14px\);/);
assert.match(blockFor(".login-pain-item p"), /text-overflow:\s*ellipsis;/);

assert.match(blockFor(".login-process-card"), /overflow:\s*hidden;/);
assert.match(blockFor(".login-process-grid"), /clamp\(8px,\s*2\.8vw,\s*14px\)/);
assert.match(blockFor(".login-process-grid"), /gap:\s*clamp\(2px,\s*1\.2vw,\s*5px\);/);
assert.match(blockFor(".login-process-item"), /overflow:\s*hidden;/);
assert.match(blockFor(".login-process-icon"), /width:\s*clamp\(50px,\s*14\.5vw,\s*56px\);/);
assert.match(blockFor(".login-process-icon img"), /width:\s*clamp\(28px,\s*8vw,\s*32px\);/);
assert.match(blockFor(".login-step-badge"), /width:\s*clamp\(18px,\s*5\.4vw,\s*20px\);/);
assert.match(blockFor(".login-process-arrow"), /overflow:\s*hidden;/);

assert.ok(css.includes("@media (max-width: 360px)"), "360px fallback should exist");
assert.ok(!blockFor(".login-process-grid").includes("14px minmax"), "fixed 14px process columns should be replaced");
assert.ok(!blockFor(".login-process-icon").includes("width: 56px;"), "fixed process icon width should be replaced");

console.log("login card overflow rules ok");
