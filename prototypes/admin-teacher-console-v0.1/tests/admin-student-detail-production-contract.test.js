const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");

for (const bookCode of ["880", "1000", "660", "yanxuan", "yanxuan_basic"]) {
  assert.ok(
    appSource.includes(bookCode),
    `admin student detail book options should include public seed book ${bookCode}`
  );
}

assert.ok(
  !appSource.includes('["330", "330"]'),
  "admin student detail book options should not include old 330 option"
);

assert.ok(
  appSource.includes("function studentDetailConfirmationFields"),
  "save-student modal should build confirmation rows from the current edited form values"
);
assert.ok(
  appSource.includes("studentDetailConfirmationFields(target)") &&
    appSource.includes('if (actionKey === "save_student")'),
  "save-student action should use dynamic confirmation rows instead of static flow fields"
);

for (const submittedField of [
  "primaryBooks",
  "backupBook",
  "nextPlanStartChapterId",
  "contactQQ",
]) {
  assert.ok(
    appSource.includes(submittedField),
    `save-student confirmation should cover submitted field ${submittedField}`
  );
}

assert.ok(
  !appSource.includes('modalEyebrow.textContent = flow.danger ? "高风险模拟操作" : "后台模拟操作"'),
  "action modal eyebrow should not use the old mock-operation wording"
);
assert.ok(
  !appSource.includes('detailRow("演示动态码"'),
  "high-risk operation modal should not expose a demo TOTP code"
);
assert.ok(
  !appSource.includes("动态码错误。演示原型"),
  "high-risk operation modal should not tell operators to use prototype demo codes"
);
assert.ok(
  !dataSource.includes('successMessage: "已模拟保存学生资料"'),
  "save-student success copy should use real-operation wording"
);

console.log("admin student detail production contract ok");
