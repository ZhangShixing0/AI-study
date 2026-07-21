import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const backendMain = read("backend/main.py");
const deployScript = read("deploy/create-deploy-package.ps1");
const deployReadme = read("deploy/README.md");
const packageManifest = read("deploy/package-manifest.md");
const deployIgnore = read(".deployignore");
const smokeTestPath = path.join(root, "deploy/smoke-test-v3.3-postgres.py");

const frontendDirMatch = backendMain.match(/PROTOTYPE_DIR\s*=\s*ROOT_DIR\s*\/\s*"prototypes"\s*\/\s*"([^"]+)"/);
const frontendDir = frontendDirMatch?.[1] || "";
const studentIndex = read(`prototypes/${frontendDir || "student-mobile-v3.3"}/index.html`);

const expectations = [
  ["backend serves student-mobile-v3.3", () => frontendDir === "student-mobile-v3.3"],
  ["deploy script includes served frontend directory", () => deployScript.includes(`prototypes\\${frontendDir}`) || deployScript.includes("$StudentFrontend")],
  ["deploy README documents served frontend directory", () => deployReadme.includes(`prototypes/${frontendDir}/`)],
  ["package manifest includes served frontend directory", () => packageManifest.includes(`prototypes/${frontendDir}/**`)],
  ["deploy script does not package old student-mobile-v1.2 frontend", () => !deployScript.includes("prototypes\\student-mobile-v1.2")],
  ["deploy script does not package old student-mobile-v2.1 frontend", () => !deployScript.includes("prototypes\\student-mobile-v2.1")],
  ["deploy script does not package old student-mobile-v3.2 frontend", () => !deployScript.includes("prototypes\\student-mobile-v3.2")],
  ["deploy README no longer documents old student-mobile-v2.1 frontend", () => !deployReadme.includes("prototypes/student-mobile-v2.1/")],
  ["package manifest no longer includes old student-mobile-v2.1 frontend", () => !packageManifest.includes("prototypes/student-mobile-v2.1/")],
  ["deploy script excludes frontend static data directory", () => deployScript.includes(`prototypes\\${frontendDir}\\data\\*`) || deployScript.includes("$StudentFrontend\\data\\*")],
  ["deploy script excludes admin console tests", () => deployScript.includes("$AdminConsole\\tests\\*")],
  ["student experience entry loads explicit experience data file", () => studentIndex.includes('src="data/experience-data.js')],
  ["deploy script keeps experience data file for immediate preview", () => deployScript.includes("experience-data.js")],
  ["deployignore keeps experience data file for immediate preview", () => deployIgnore.includes("!prototypes/student-mobile-v3.3/data/experience-data.js")],
  ["package manifest documents frontend static data exclusion", () => packageManifest.includes(`prototypes/${frontendDir}/data/`)],
  ["package manifest documents experience data exception", () => packageManifest.includes("experience-data.js")],
  ["deploy script excludes data sample inspection files", () => /Extension\s+-eq\s+"\.xlsx"/.test(deployScript) && /\.inspect\.ndjson/.test(deployScript)],
  ["deploy script excludes local database artifacts", () => deployScript.includes("$excludedFileNamePatterns") && deployScript.includes('"*.db"') && deployScript.includes('"*.sqlite"')],
  ["deploy script does not explicitly include root README or docs", () => !deployScript.includes('"README.md"') && !deployScript.includes('"docs\\')],
  ["deploy script excludes Markdown files from production package", () => /"\.md"/.test(deployScript)],
  ["package manifest documents Markdown exclusion", () => packageManifest.includes("*.md")],
  ["deploy script includes release version", () => deployScript.includes('"VERSION"')],
  ["package manifest includes release version", () => packageManifest.includes("`VERSION`")],
  ["deploy script creates zip entries with Linux forward slash paths", () => !deployScript.includes("Compress-Archive") && /entryName\s*=\s*\(\$relative\s*-replace\s*["']\\\\["']\s*,\s*["']\/["']\)/.test(deployScript)],
  ["v3.3 PostgreSQL smoke test script exists", () => fs.existsSync(smokeTestPath)],
  ["deploy README documents v3.3 PostgreSQL smoke test", () => deployReadme.includes("deploy/smoke-test-v3.3-postgres.py")],
  ["package manifest includes postgres runtime schema", () => packageManifest.includes("data/production-seed/postgres_runtime_schema.sql")],
];

const failures = expectations
  .filter(([, check]) => !check())
  .map(([name]) => name);

if (failures.length) {
  console.error("Deployment package verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deployment package verification passed.");
