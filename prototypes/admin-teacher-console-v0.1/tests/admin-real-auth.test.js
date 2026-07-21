const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

assert.ok(
  source.includes("/auth/login"),
  "admin console login should call the backend auth login endpoint"
);
assert.ok(
  source.includes("requiresTotpSetup") && source.includes("setupToken") && source.includes("manualSecret"),
  "admin console should handle first-time TOTP setup returned by the backend"
);
assert.ok(
  source.includes("requiresTotp"),
  "admin console should handle bound-admin TOTP challenge returned by the backend"
);
assert.ok(
  source.includes("BACKOFFICE_AUTH_STORAGE_KEY"),
  "admin console should persist the current backoffice session on this device"
);
assert.ok(
  source.includes("function renderAdminDataLoading") &&
    source.includes("!state.adminDataLoaded") &&
    source.includes("data-admin-data-retry"),
  "admin console should show a loading gate before rendering backend business data"
);
assert.match(
  source,
  /if \(state\.authStage === "authenticated" && !state\.adminDataLoaded\) \{[\s\S]*renderAdminDataLoading\(\);[\s\S]*return;[\s\S]*\}[\s\S]*const viewMap =/,
  "admin console loading gate should run before business views can read demo fallback data"
);
for (const header of ["Authorization", "X-Session-Id", "X-Device-Id"]) {
  assert.ok(
    source.includes(header),
    `admin console API requests should include ${header}`
  );
}
assert.ok(
  !source.includes('value="AiduXue#2026!Run"'),
  "admin console must not prefill a fake/demo password"
);
assert.ok(
  !source.includes('if (account.startsWith("adm"))'),
  "admin console must not grant admin access from a front-end account-prefix check"
);
assert.ok(
  !source.includes('if (account.startsWith("tea"))'),
  "admin console must not grant teacher access from a front-end account-prefix check"
);
assert.ok(
  indexHtml.includes("app.js?v=11"),
  "admin console index should bump the app.js cache key when login behavior changes"
);
assert.ok(
  !indexHtml.includes("app.js?v=2") &&
    !indexHtml.includes("app.js?v=3") &&
    !indexHtml.includes("app.js?v=4") &&
    !indexHtml.includes("app.js?v=5") &&
    !indexHtml.includes("app.js?v=6") &&
    !indexHtml.includes("app.js?v=7") &&
    !indexHtml.includes("app.js?v=8") &&
    !indexHtml.includes("app.js?v=9") &&
    !indexHtml.includes("app.js?v=10"),
  "admin console index should not keep the old app.js cache key"
);

console.log("admin real auth contract ok");
