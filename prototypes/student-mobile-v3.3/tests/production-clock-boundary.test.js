const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.ok(
  !source.includes("notifyTestClockChanged"),
  "production student code should not expose the removed simulated-clock notifier"
);
assert.ok(
  !source.includes("ai-supervisor-test-clock"),
  "production student code should not broadcast simulated date changes"
);
assert.ok(
  !indexHtml.includes("data-load-next-test-day"),
  "production student UI should not expose a next-test-day action"
);

console.log("production clock boundary ok");
