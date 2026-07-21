const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const studentRoot = path.join(__dirname, "..");
const repoRoot = path.join(studentRoot, "..", "..");
const adminRoot = path.join(repoRoot, "prototypes", "admin-teacher-console-v0.1");
const studentIndex = fs.readFileSync(path.join(studentRoot, "index.html"), "utf8");
const studentCss = fs.readFileSync(path.join(studentRoot, "styles", "app.css"), "utf8");
const adminIndex = fs.readFileSync(path.join(adminRoot, "index.html"), "utf8");
const adminCss = fs.readFileSync(path.join(adminRoot, "styles.css"), "utf8");
const policeLink = "https://beian.mps.gov.cn/#/query/webSearch?code=41108202000963";

for (const source of [studentIndex, adminIndex]) {
  assert.match(source, /豫ICP备2026030408号/);
  assert.ok(source.includes(policeLink), "the public security filing should link to its official record");
  assert.match(source, /豫公网安备41108202000963号/);
  assert.match(source, /\/assets\/icons\/beian-police\.png/);
}

for (const source of [studentCss, adminCss]) {
  assert.match(source, /\.site-filing-links\s*\{[\s\S]*display: flex;[\s\S]*flex-wrap: wrap;/);
  assert.match(source, /\.site-police-filing img\s*\{[\s\S]*width: 16px;[\s\S]*height: 16px;/);
}

assert.ok(
  fs.existsSync(path.join(studentRoot, "assets", "icons", "beian-police.png")),
  "the public security filing icon should be included in the student static assets"
);

console.log("public security filing contract ok");
