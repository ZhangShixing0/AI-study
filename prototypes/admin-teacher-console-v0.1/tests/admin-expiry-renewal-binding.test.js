const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

for (const token of [
  "function adminDueRows()",
  "function serviceSoonRows()",
  "function isTrialExpiredForAdmin(student)",
  'student.accountType === "trial"',
  "dayDiff(student.paidUntil) < 0",
  'actionButton("续费30天", "renew_service_30_days"',
  'adminApiRequest(`/admin/students/${apiSegment(target)}/renew-service`',
  "await loadAdminConsoleDataIfNeeded(true)",
]) {
  assert.ok(source.includes(token), `admin expiry/renewal binding should include ${token}`);
}

assert.match(
  source,
  /const trialExpired = DATA\.students\s*\.filter\(\(student\) => isTrialExpiredForAdmin\(student\)\)/s,
  "admin expiry rows should include expired trial accounts by paidUntil, not only by accountStatus"
);

assert.match(
  source,
  /function serviceSoonRows\(\)[\s\S]*isFormalLike\(student\)[\s\S]*dayDiff\(student\.paidUntil\) >= 0[\s\S]*dayDiff\(student\.paidUntil\) <= DATA\.servicePolicy\.soonDueDays/s,
  "renewal reminders should be computed from live paidUntil for formal-like accounts"
);

console.log("admin expiry and renewal binding contract ok");
