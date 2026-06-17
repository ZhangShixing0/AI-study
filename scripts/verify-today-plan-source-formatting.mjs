import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const {
  buildSourceGroups,
  formatFeedbackLabel,
} = require("../prototypes/student-mobile-v1.2/assets/js/source-formatting.js");

const groups = buildSourceGroups([
  {
    source: "880",
    items: [
      "第1章强化一第5题",
      "第1章强化一第8题",
      "第1章强化一第11题",
      "第1章强化一第13题",
      "第1章强化一第16题",
      "第1章强化一第18题",
      "第1章强化一第21题",
      "第1章强化一第24题",
      "第1章强化一第27题",
      "第1章强化一第30题",
      "第1章强化二第12题",
      "第1章强化三第6题",
      "第1章强化三第7题",
      "第1章强化三第11题",
      "第1章基础三第2(2)～(8)题",
    ],
  },
  {
    source: "1000",
    items: [
      "《1000》第1章强化第17题",
      "《1000》第1章强化第18题",
    ],
  },
]);

assert.equal(groups.length, 2);

assert.equal(groups[0].sourceName, "880");
assert.equal(groups[0].sourceLabel, "《880》");
assert.equal(groups[0].showSourceLabel, true);
assert.equal(groups[0].title, "《880》第一章 强化 选择题：");
assert.equal(groups[0].continuationTitle, "第一章 强化 选择题：");
assert.deepEqual(groups[0].numbers, ["5", "8", "11", "13", "16", "18", "21", "24", "27", "30"]);
assert.equal(groups[0].entries.length, 4);
assert.equal(groups[0].entries[0].title, "第一章 强化 选择题：");
assert.deepEqual(groups[0].entries[0].numbers, ["5", "8", "11", "13", "16", "18", "21", "24", "27", "30"]);

assert.equal(groups[0].entries[1].title, "第一章 强化 填空题：");
assert.deepEqual(groups[0].entries[1].numbers, ["12"]);
assert.equal(groups[0].entries[2].title, "第一章 强化 解答题：");
assert.deepEqual(groups[0].entries[2].numbers, ["6", "7", "11"]);
assert.equal(groups[0].entries[3].title, "第一章 基础 解答题：");
assert.deepEqual(groups[0].entries[3].numbers, ["2(2)～(8)"]);
assert.equal(groups[1].title, "《1000》第一章 强化：");
assert.deepEqual(groups[1].numbers, ["17", "18"]);

const basicGroups = buildSourceGroups([
  {
    source: "880",
    items: [
      "《880》第1章基础一第4题",
      "《880》第1章基础一第5题",
      "《880》第1章基础一第10题",
    ],
  },
]);

assert.equal(basicGroups.length, 1);
assert.equal(basicGroups[0].title, "《880》第一章 基础 选择题：");
assert.deepEqual(basicGroups[0].numbers, ["4", "5", "10"]);

const duplicateLabelGroups = buildSourceGroups([
  {
    source: "880",
    items: [
      "《880》 《880》 《880》第1章基础二第2题",
      "《880》第1章基础二第3题",
    ],
  },
]);

assert.equal(duplicateLabelGroups.length, 1);
assert.equal(duplicateLabelGroups[0].title, "《880》第一章 基础 填空题：");
assert.deepEqual(duplicateLabelGroups[0].numbers, ["2", "3"]);

assert.equal(
  formatFeedbackLabel("《880》第1章强化一第4题"),
  "《880》第一章 强化 选择 第4题",
);
assert.equal(
  formatFeedbackLabel("《1000》第1章强化第17题"),
  "《1000》第一章 强化 第17题",
);

console.log("today plan source formatting ok");
