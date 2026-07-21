const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  source.includes("data.newPassword || data.temporaryPassword || data.initialPassword"),
  "reset password action should display the backend newPassword/temporaryPassword field"
);
assert.ok(
  source.includes("lastResetPassword"),
  "reset password result should be kept in page state instead of only a toast"
);
assert.ok(
  source.includes("data-copy-reset-password"),
  "reset password result should render a copy-password button"
);
assert.ok(
  source.includes("async function copyText"),
  "admin console should use a reusable clipboard helper"
);
assert.ok(
  source.includes("function fallbackCopyText"),
  "admin console should provide a textarea fallback for clipboard copy"
);
assert.ok(
  source.includes("已复制"),
  "copy-password action should acknowledge successful copy"
);

console.log("admin reset password response binding ok");
