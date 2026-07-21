const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");

assert.match(html, /id="loginPassword"[^>]*type="password"/);
assert.match(html, /class="login-password-eye"/);
assert.match(html, /aria-pressed="false"/);

assert.match(css, /\.login-password-wrap input\s*{[^}]*padding-right:\s*48px;/s);
assert.match(css, /\.login-password-eye\s*{[^}]*width:\s*32px;[^}]*height:\s*32px;/s);
assert.match(css, /\.login-password-eye\s*{[^}]*cursor:\s*pointer;/s);
assert.match(css, /\.login-password-eye\s*{[^}]*z-index:\s*2;/s);
assert.match(css, /\.login-password-eye\s*{[^}]*pointer-events:\s*auto;/s);
assert.match(css, /\.login-password-eye\.is-visible/);

assert.match(js, /querySelector\("#loginPassword"\)/);
assert.match(js, /querySelector\("\.login-password-eye"\)/);
assert.match(js, /passwordInput\.type\s*=\s*shouldShow\s*\?\s*"text"\s*:\s*"password"/);
assert.match(js, /passwordToggle\.classList\.toggle\("is-visible",\s*shouldShow\)/);
assert.match(js, /setAttribute\("aria-pressed",\s*String\(shouldShow\)\)/);

console.log("login password eye ok");
