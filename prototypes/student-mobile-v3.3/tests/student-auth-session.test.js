const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/app.js"),
  "utf8"
);

assert.match(source, /const STUDENT_AUTH_STORAGE_KEY = "AI_TUTOR_STUDENT_AUTH"/);
assert.match(source, /function getOrCreateStudentDeviceId\(/);
assert.match(source, /function saveStudentAuth\(/);
assert.match(source, /function loadStudentAuth\(/);
assert.match(source, /function clearStudentAuth\(/);
assert.match(source, /function studentAuthHeaders\(/);
assert.match(source, /Authorization": `Bearer \$\{auth\.token\}`/);
assert.match(source, /"X-Session-Id": auth\.sessionId/);
assert.match(source, /"X-Device-Id": auth\.deviceId/);
assert.match(source, /SESSION_REPLACED/);
assert.match(source, /SESSION_EXPIRED/);
assert.match(source, /SESSION_REQUIRED/);
assert.match(source, /function handleStudentSessionExpired\(/);
assert.match(source, /restoreStudentSession/);
assert.match(source, /saveStudentAuth\(loginData, loginAccount\)/);
assert.match(source, /deviceId: getOrCreateStudentDeviceId\(\)/);
assert.match(source, /saveStudentAuth\(completedResult, loginAccount\)/);
assert.match(source, /apiRequest\("\/auth\/me"\)/);
assert.match(source, /let studentAuthGeneration = 0/);
assert.match(source, /function invalidateStudentAuthRestore\(\)/);
assert.match(source, /studentAuthGeneration \+= 1/);
assert.match(source, /function isSameStudentAuthRecord\(/);
assert.match(source, /function isCurrentRestoreAuth\(auth, generation\)/);
assert.match(source, /let restoreGeneration = studentAuthGeneration/);
assert.match(source, /if \(!isCurrentRestoreAuth\(auth, restoreGeneration\)\) return false/);
assert.match(source, /restoreGeneration = studentAuthGeneration/);
assert.match(source, /invalidateStudentAuthRestore\(\);\s+const loginData = await apiRequest\("\/auth\/login"/);
assert.match(source, /const requestAuth = loadStudentAuth\(\)/);
assert.match(source, /handleStudentSessionExpired\(message \|\| "账号已在其他设备登录，请重新登录。", requestAuth\)/);
assert.match(source, /function handleStudentSessionExpired\(message, authSnapshot = null\)/);
assert.match(source, /if \(authSnapshot && !isSameStudentAuthRecord\(authSnapshot, loadStudentAuth\(\)\)\) return/);
assert.match(source, /if \(typeof window\.closeStudentOnboarding === "function"\) \{/);
assert.match(source, /window\.closeStudentOnboarding\(\);/);
assert.match(source, /function isStudentSessionAuthError\(/);
assert.match(source, /requestError\.studentSessionAuth = true/);
assert.match(source, /if \(isStudentSessionAuthError\(error\) && isCurrentRestoreAuth\(auth, restoreGeneration\)\) \{/);
assert.doesNotMatch(
  source,
  /catch \(error\) \{\s+if \(isCurrentRestoreAuth\(auth, restoreGeneration\)\) \{\s+clearStudentAuth\(\);/,
  "restore should not clear saved login for non-session plan-loading errors"
);

console.log("student auth session frontend contract ok");
