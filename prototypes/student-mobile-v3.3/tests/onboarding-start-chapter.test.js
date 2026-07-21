const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/onboarding.js"),
  "utf8"
);

function functionBlock(name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `should find ${name}()`);
  return match[0];
}

assert.match(source, /startChapterId/, "onboarding should track startChapterId");
assert.match(source, /强化开始章节/, "step one should render the start chapter field");
assert.match(
  source,
  /startChapterOptionsByReviewOrder/,
  "chapter options should come from public registration options"
);
assert.match(
  source,
  /startChapterOptions\(\)\.map/,
  "chapter select should render from normalized chapter options"
);
assert.match(
  source,
  /startChapterId:\s*values\.startChapterId/,
  "payload should include startChapterId"
);
assert.match(
  functionBlock("saveStepOneValues"),
  /\[[\s\S]*"startChapterId"[\s\S]*\]\.forEach/,
  "saveStepOneValues should collect startChapterId from the form"
);
assert.match(
  source,
  /const reviewOrderField = event\.target\.closest\("select\[name='reviewOrder'\]"\);[\s\S]*?if \(reviewOrderField && state\.step === 1\) \{[\s\S]*?saveStepOneValues\(\);[\s\S]*?applyRegistrationDefaults\(\);[\s\S]*?render\(\);[\s\S]*?return;[\s\S]*?\}/,
  "review order changes should save values, refresh defaults, render, and return"
);
assert.match(source, /M2-CH-0001/, "math2 fallback should include the first chapter id");
assert.match(source, /极限/, "math2 fallback should include real chapter names");
assert.match(source, /M2-CH-0015/, "math2 fallback should include the final chapter id");
assert.match(source, /二次型/, "math2 fallback should include linear algebra chapter names");
assert.match(
  source,
  /prefix === "m2"[\s\S]*\? math2FallbackStartChapterOptions\(\)[\s\S]*:\s*\{[\s\S]*mixed:\s*\[\],[\s\S]*gaoshu_first:\s*\[\],[\s\S]*\}/,
  "only math2 should receive real fallback chapters; math1/math3 should use empty fallback lists"
);
assert.match(
  source,
  /mixed:[\s\S]*M2-CH-0007[\s\S]*M2-CH-0010[\s\S]*M2-CH-0005/,
  "mixed fallback order should interleave high math and linear algebra chapters"
);
assert.match(
  source,
  /fallback\.startChapterOptionsByReviewOrder/,
  "normalization should consult fallback chapter options"
);
assert.match(
  source,
  /seenChapterIds\s*=\s*new Set\(\)/,
  "normalization should track seen chapter ids when merging raw and fallback chapters"
);
assert.match(
  source,
  /for \(const chapter of rawChapters\)[\s\S]*seenChapterIds\.add\(chapter\.chapterId\)/,
  "normalization should keep valid raw chapters first"
);
assert.match(
  source,
  /for \(const chapter of fallbackChapters\)[\s\S]*if \(seenChapterIds\.has\(chapter\.chapterId\)\) continue;[\s\S]*mergedChapters\.push\(chapter\)/,
  "normalization should append fallback chapters missing from partial raw options"
);
assert.match(
  source,
  /chapters\[0\]\?\.chapterId\s*\|\|\s*""/,
  "startChapterId should default to the first chapter for the active review order"
);

console.log("onboarding start chapter binding ok");
