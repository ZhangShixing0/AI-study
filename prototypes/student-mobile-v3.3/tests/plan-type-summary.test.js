const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/plan.js"),
  "utf8"
);
const context = {};
vm.runInNewContext(source, context);

assert.equal(typeof context.typeSummary, "function");

assert.deepEqual(
  context.typeSummary({
    summary: {
      title: "易错｜概念题：复合极限辨析",
      body: "复合极限先看内层趋向、定义域和连续性条件。",
    },
  }),
  {
    title: "易错｜概念题：复合极限辨析",
    body: "复合极限先看内层趋向、定义域和连续性条件。",
  }
);

const fallback = context.typeSummary({ index: 1 });
assert.ok(!fallback.title.includes("积分基本功题型"));
assert.ok(!fallback.body.includes("换元"));

console.log("plan type summary binding ok");
