const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/curve.js"),
  "utf8"
);

assert.match(source, /本周正确率/);
assert.match(source, /完成题型/);
assert.match(source, /weekly\.accuracyRate/);
assert.match(source, /weekly\.completedTypeCount/);
assert.doesNotMatch(source, />复错率</);

console.log("curve banner contract ok");
