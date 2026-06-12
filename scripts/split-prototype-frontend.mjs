import fs from "node:fs";
import path from "node:path";

const root = "prototypes/student-mobile-v0.1";
const indexPath = path.join(root, "index.html");
const html = fs.readFileSync(indexPath, "utf8");

function extractBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start === -1 || end === -1) {
    throw new Error(`Cannot find block ${startToken} ... ${endToken}`);
  }
  return {
    before: source.slice(0, start),
    inner: source.slice(start + startToken.length, end),
    after: source.slice(end + endToken.length),
    full: source.slice(start, end + endToken.length),
  };
}

function findFunctionBlock(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Cannot find ${functionName}`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  let inString = null;
  let inTemplateExpressionDepth = 0;
  let escaped = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (inString === "`" && char === "$" && next === "{") {
        inTemplateExpressionDepth += 1;
        index += 1;
        continue;
      }
      if (inString === "`" && inTemplateExpressionDepth > 0) {
        if (char === "{") inTemplateExpressionDepth += 1;
        if (char === "}") inTemplateExpressionDepth -= 1;
        continue;
      }
      if (char === inString) inString = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        let end = index + 1;
        while (source[end] === "\r" || source[end] === "\n") end += 1;
        return source.slice(start, end);
      }
    }
  }
  throw new Error(`Cannot find end of ${functionName}`);
}

function writeText(relativePath, text) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text.trimStart(), "utf8");
}

const styleBlock = extractBetween(html, "    <style>", "    </style>");
writeText("styles/app.css", `${styleBlock.inner}\n`);

const scriptBlock = extractBetween(html, "    <script>\n", "    </script>");
let appScript = scriptBlock.inner;

const pages = {
  "assets/js/pages/plan.js": ["renderPlan"],
  "assets/js/pages/rank.js": ["renderRank"],
  "assets/js/pages/curve.js": ["buildLossDonutSvg", "renderCurve"],
  "assets/js/pages/study-room.js": ["renderFocusSessionPage", "renderStudyRoom"],
  "assets/js/pages/profile.js": ["renderProfile"],
};

for (const [relativePath, functionNames] of Object.entries(pages)) {
  const blocks = functionNames.map((functionName) => findFunctionBlock(appScript, functionName));
  for (const block of blocks) {
    appScript = appScript.replace(block, "");
  }
  writeText(relativePath, `${blocks.join("\n\n")}\n`);
}

writeText("assets/js/app.js", `${appScript}\n`);

let nextHtml = html.replace(
  styleBlock.full,
  '    <link rel="stylesheet" href="styles/app.css" />',
);
nextHtml = nextHtml.replace(
  scriptBlock.full,
  [
    '    <script src="assets/js/pages/plan.js"></script>',
    '    <script src="assets/js/pages/rank.js"></script>',
    '    <script src="assets/js/pages/curve.js"></script>',
    '    <script src="assets/js/pages/study-room.js"></script>',
    '    <script src="assets/js/pages/profile.js"></script>',
    '    <script src="assets/js/app.js"></script>',
  ].join("\n"),
);
fs.writeFileSync(indexPath, nextHtml, "utf8");
