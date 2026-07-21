const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(
  path.join(__dirname, "../assets/js/app.js"),
  "utf8"
);

assert.match(
  appSource,
  /const schoolId = school\.schoolId \|\| school\.id \|\| "";/,
  "school search should accept both schoolId and legacy id fields"
);

assert.match(
  appSource,
  /const schoolTags = Array\.isArray\(school\.tags\)\s*\?\s*school\.tags\s*:\s*String\(school\.tags \|\| ""\)\.split\(","\)\.filter\(Boolean\);/,
  "school search should render tag arrays and comma-separated tag strings"
);

assert.match(
  appSource,
  /data-school-id="\$\{escapeHtml\(schoolId\)\}"/,
  "school search result buttons should use the normalized school id"
);

assert.match(
  appSource,
  /escapeHtml\(schoolTags\.join/,
  "school search should join normalized tags"
);

console.log("profile school search contract ok");
