const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/onboarding.js"),
  "utf8"
);

const finishStart = source.indexOf("async function finishOnboarding");
const submitStart = source.indexOf("async function submitOnboarding");
const renderStart = source.indexOf("function render()", submitStart);
const closeStart = source.indexOf("window.closeStudentOnboarding = function closeStudentOnboarding");
const showStart = source.indexOf("window.showStudentOnboarding = async function showStudentOnboarding");

assert.ok(finishStart > -1, "onboarding should finish through a dedicated transition helper");
assert.ok(submitStart > -1 && renderStart > submitStart, "submitOnboarding block should be present");
assert.ok(closeStart > -1, "onboarding should expose a close helper for session replacement");
assert.ok(closeStart < showStart, "close helper should be registered with the onboarding module API");

const finishBlock = source.slice(finishStart, submitStart);
const submitBlock = source.slice(submitStart, renderStart);
const closeBlock = source.slice(closeStart, showStart);

assert.match(finishBlock, /await state\.onComplete\(result\.user \|\| state\.user, result\)/);
assert.ok(
  finishBlock.indexOf("await state.onComplete") < finishBlock.indexOf("root.hidden = true"),
  "onboarding screen should hide only after the app plan has loaded"
);
assert.doesNotMatch(
  submitBlock,
  /root\.hidden\s*=\s*true/,
  "submitOnboarding should not hide the screen before loading the student app"
);
assert.match(
  submitBlock,
  /let result = state\.completedResult;/,
  "a completed onboarding response should be reused when retrying app entry"
);
assert.match(
  submitBlock,
  /state\.completedResult = result;/,
  "successful onboarding response should be cached before loading the app"
);
assert.match(source, /重新进入今日计划/);
assert.match(source, /资料已保存，但今日计划加载失败/);

assert.match(closeBlock, /root\.hidden = true/);
assert.match(closeBlock, /document\.body\.classList\.remove\("onboarding-active"\)/);
assert.match(closeBlock, /completionResolve = null/);

console.log("onboarding transition retry rules ok");
