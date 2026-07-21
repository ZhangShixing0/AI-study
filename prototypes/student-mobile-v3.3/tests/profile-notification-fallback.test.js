const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

assert.ok(
  source.includes("const PROFILE_DEFAULT_NOTIFICATIONS = [];"),
  "profile notifications should default to an empty list"
);
assert.ok(
  !source.includes("PROFILE_TEST_NOTIFICATIONS"),
  "profile notifications should not keep the old test fallback constant"
);
assert.ok(
  !source.includes("测试通知") && !source.includes("测试公告") && !source.includes("这是一条用于检查"),
  "student bell should not include a hardcoded test notification"
);
assert.ok(
  source.includes("renderNotificationSheet(data.items || PROFILE_DEFAULT_NOTIFICATIONS)"),
  "empty API notification lists should render as empty instead of falling back to test content"
);

console.log("profile notification fallback contract ok");
