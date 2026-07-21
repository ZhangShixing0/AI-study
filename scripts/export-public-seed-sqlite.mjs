import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  IMPORT_ORDER,
  TABLE_KEYS,
} from "./import-production-seed.mjs";
import {
  TABLES,
  readWorkbookTables,
  validateTables,
} from "./validate-production-seed.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");

const DEFAULT_INPUT = path.join(repoRoot, "data", "production-seed", "math2_public_seed_v1.xlsx");
const DEFAULT_OUTPUT = path.join(repoRoot, "data", "production-seed", "math2_public_seed_v1.sqlite");
const DEFAULT_RUNTIME_DB = path.join(repoRoot, "backend", "app.db");

const BOOLEAN_FIELDS = new Set([
  "is_active",
  "direct_assignable",
  "is_registration_selectable",
  "is_accepting_new_students",
  "is_test_class",
]);

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

export function sqliteValue(fieldName, value) {
  const normalized = text(value);
  if (!normalized) return "";
  if (!BOOLEAN_FIELDS.has(fieldName)) return normalized;

  const lower = normalized.toLowerCase();
  if (["1", "true", "yes", "是", "active"].includes(lower)) return "1";
  if (["0", "false", "no", "否", "inactive"].includes(lower)) return "0";
  throw new Error(`Invalid boolean value for ${fieldName}: ${value}`);
}

export function createTableSql(tableName, columns, keys = []) {
  const allColumns = [...columns, "created_at", "updated_at", "imported_at", "import_source"];
  const definitions = allColumns.map((column) => `  ${quoteIdentifier(column)} TEXT NOT NULL DEFAULT ''`);
  if (keys.length) {
    definitions.push(`  PRIMARY KEY (${keys.map(quoteIdentifier).join(", ")})`);
  }
  return [
    `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName)} (`,
    definitions.join(",\n"),
    ");",
  ].join("\n");
}

function pythonWriterScript() {
  return String.raw`
import json
import sqlite3
import sys
from pathlib import Path

payload_path = Path(sys.argv[1])
data = json.loads(payload_path.read_text(encoding="utf-8"))

db_path = Path(data["output"])
db_path.parent.mkdir(parents=True, exist_ok=True)
if data.get("replace_file") and db_path.exists():
    db_path.unlink()

conn = sqlite3.connect(db_path)
try:
    conn.execute("PRAGMA foreign_keys = OFF")
    cursor = conn.cursor()
    for table_name in reversed(data["import_order"]):
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')

    for table_name in data["import_order"]:
        cursor.execute(data["create_sql"][table_name])
        columns = data["tables"][table_name]["columns"]
        rows = data["tables"][table_name]["rows"]
        insert_columns = columns + ["created_at", "updated_at", "imported_at", "import_source"]
        placeholders = ", ".join(["?"] * len(insert_columns))
        quoted_columns = ", ".join(f'"{column}"' for column in insert_columns)
        sql = f'INSERT OR REPLACE INTO "{table_name}" ({quoted_columns}) VALUES ({placeholders})'
        cursor.executemany(sql, rows)

    for index_sql in data.get("indexes", []):
        cursor.execute(index_sql)

    conn.commit()
finally:
    conn.close()
`;
}

function sqlitePayloadFor(tables, options = {}) {
  const importSource = options.importSource || "math2_public_seed_v1.xlsx";
  const timestamp = options.timestamp || new Date().toISOString();
  const createSql = {};
  const tablePayload = {};

  for (const tableName of IMPORT_ORDER) {
    const columns = TABLES[tableName];
    const keys = TABLE_KEYS[tableName] || [];
    createSql[tableName] = createTableSql(tableName, columns, keys);
    tablePayload[tableName] = {
      columns,
      rows: (tables[tableName] || []).map((row) => [
        ...columns.map((column) => sqliteValue(column, row[column])),
        timestamp,
        timestamp,
        timestamp,
        importSource,
      ]),
    };
  }

  return {
    output: options.output,
    replace_file: Boolean(options.replaceFile),
    import_order: IMPORT_ORDER,
    create_sql: createSql,
    tables: tablePayload,
    indexes: [
      'CREATE INDEX IF NOT EXISTS "idx_questions_type_book" ON "questions" ("type_id", "book_id")',
      'CREATE INDEX IF NOT EXISTS "idx_questions_active" ON "questions" ("is_active")',
      'CREATE INDEX IF NOT EXISTS "idx_question_types_chapter" ON "question_types" ("chapter_id")',
      'CREATE INDEX IF NOT EXISTS "idx_question_type_orders_sort_code" ON "question_type_orders" ("plan_variant_id", "sort_code")',
      'CREATE INDEX IF NOT EXISTS "idx_classes_intake" ON "classes" ("math_type", "level", "is_accepting_new_students")',
      'CREATE INDEX IF NOT EXISTS "idx_exercise_books_registration" ON "exercise_books" ("math_type", "is_registration_selectable", "is_active", "sort_order")',
    ],
  };
}

async function runPythonJson(args) {
  const candidates = [...new Set([
    process.env.PYTHON_BIN,
    path.join(repoRoot, ".venv", "Scripts", "python.exe"),
    path.join(repoRoot, ".venv", "bin", "python"),
    "python",
    "python3",
  ].filter(Boolean))];

  let lastError = null;
  for (const pythonBin of candidates) {
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(pythonBin, args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
        const stderr = [];
        child.stderr.on("data", (chunk) => stderr.push(chunk));
        child.on("error", reject);
        child.on("close", (code) => {
          const stderrText = Buffer.concat(stderr).toString("utf8").trim();
          if (code !== 0) {
            reject(new Error(`${pythonBin} exited with code ${code}${stderrText ? `: ${stderrText}` : ""}`));
            return;
          }
          resolve();
        });
      });
      return pythonBin;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Python SQLite writer failed: ${lastError?.message || "python not found"}`);
}

async function writeSqlite(payload) {
  const tempDir = path.join(repoRoot, ".tmp", "public-seed-sqlite");
  await fs.mkdir(tempDir, { recursive: true });
  const payloadPath = path.join(tempDir, `payload-${Date.now()}.json`);
  await fs.writeFile(payloadPath, JSON.stringify(payload), "utf8");
  try {
    return await runPythonJson(["-c", pythonWriterScript(), payloadPath]);
  } finally {
    await fs.rm(payloadPath, { force: true });
  }
}

function usage() {
  return [
    "Usage:",
    "  node scripts/export-public-seed-sqlite.mjs [options]",
    "",
    "Options:",
    "  --input <xlsx>          Public seed workbook. Defaults to data/production-seed/math2_public_seed_v1.xlsx",
    "  --output <sqlite>       Write standalone public seed SQLite. Defaults to data/production-seed/math2_public_seed_v1.sqlite",
    "  --runtime-db <sqlite>   Also sync public tables into local runtime SQLite. Defaults to backend/app.db when --sync-runtime is set",
    "  --sync-runtime          Replace public seed tables inside local runtime SQLite",
    "  --source <label>        Import source label. Defaults to workbook file name",
    "  --help                  Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    runtimeDb: DEFAULT_RUNTIME_DB,
    syncRuntime: false,
    importSource: "",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--input" && value) {
      args.input = path.resolve(value);
      index += 1;
    } else if (key === "--output" && value) {
      args.output = path.resolve(value);
      index += 1;
    } else if (key === "--runtime-db" && value) {
      args.runtimeDb = path.resolve(value);
      index += 1;
    } else if (key === "--sync-runtime") {
      args.syncRuntime = true;
    } else if (key === "--source" && value) {
      args.importSource = value;
      index += 1;
    } else if (key === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const { tables, readErrors } = await readWorkbookTables(args.input);
  const validation = validateTables(tables);
  const errors = [...readErrors, ...validation.errors];
  if (errors.length) {
    throw new Error(`Cannot export invalid public seed:\n${errors.join("\n")}`);
  }

  const importSource = args.importSource || path.basename(args.input);
  const timestamp = new Date().toISOString();
  const outputs = [];

  const publicPayload = sqlitePayloadFor(tables, {
    output: args.output,
    replaceFile: true,
    importSource,
    timestamp,
  });
  const pythonBin = await writeSqlite(publicPayload);
  outputs.push(args.output);

  if (args.syncRuntime) {
    const runtimePayload = sqlitePayloadFor(tables, {
      output: args.runtimeDb,
      replaceFile: false,
      importSource,
      timestamp,
    });
    await writeSqlite(runtimePayload);
    outputs.push(args.runtimeDb);
  }

  const tableCounts = Object.fromEntries(IMPORT_ORDER.map((tableName) => [
    tableName,
    Array.isArray(tables[tableName]) ? tables[tableName].length : 0,
  ]));

  console.log(JSON.stringify({
    input: args.input,
    outputs,
    sync_runtime: args.syncRuntime,
    runtime_db: args.syncRuntime ? args.runtimeDb : null,
    python: pythonBin,
    table_counts: tableCounts,
    warnings: validation.warnings,
    errors: [],
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
