const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

for (const token of [
  "const PRIMARY_BOOK_SCOPE_LABELS",
  "只布置基础题",
  "只布置强化题",
  "基础题和强化题都布置",
  "function primaryBookScopeField",
  "primaryBook1Scope",
  "primaryBook2Scope",
  "primaryBookScopes",
  "formatPrimaryBookSummary(student)",
]) {
  assert.ok(source.includes(token), `admin student detail should include ${token}`);
}

assert.match(
  source,
  /primaryBooks:\s*\[\s*primaryBookPayload\(1\),\s*primaryBookPayload\(2\)\s*\]\.filter\(Boolean\)/s,
  "student detail API payload should submit book+scope objects"
);

assert.ok(
  !source.includes("`${student.primaryBooks.join(\"、\")} / 备选 ${student.backupBook}`"),
  "student detail summary should not drop book scopes"
);

console.log("admin student book scope binding ok");
