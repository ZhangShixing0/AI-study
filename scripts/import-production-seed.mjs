import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  TABLES,
  readWorkbookTables,
  validateTables,
} from "./validate-production-seed.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");

const DEFAULT_INPUT = path.join(repoRoot, "data", "production-seed", "math2_public_seed_v1.xlsx");

export const IMPORT_ORDER = [
  "plan_variants",
  "chapters",
  "display_chapters",
  "chapter_display_mappings",
  "exercise_books",
  "institutions",
  "classes",
  "question_types",
  "chapter_orders",
  "question_type_orders",
  "questions",
  "chapter_summary_templates",
  "class_intake_settings",
];

export const TABLE_KEYS = {
  plan_variants: ["plan_variant_id"],
  chapters: ["chapter_id"],
  display_chapters: ["display_chapter_id"],
  chapter_display_mappings: ["math_type", "chapter_id"],
  exercise_books: ["book_id"],
  institutions: ["school_id"],
  classes: ["class_id"],
  question_types: ["type_id"],
  chapter_orders: ["plan_variant_id", "chapter_id"],
  question_type_orders: ["plan_variant_id", "type_id"],
  questions: ["question_id"],
  chapter_summary_templates: ["summary_template_id"],
  class_intake_settings: ["setting_id"],
};

const BOOLEAN_FIELDS = new Set([
  "is_active",
  "direct_assignable",
  "is_registration_selectable",
  "is_accepting_new_students",
  "is_test_class",
]);

const INTEGER_FIELDS = new Set([
  "sort_order",
  "display_sort_in_group",
  "chapter_sort",
  "type_sort_in_chapter",
  "question_order",
  "target_exam_year",
  "capacity",
]);

const NUMERIC_FIELDS = new Set([
  "duration_130_days",
  "duration_100_days",
  "duration_80_days",
]);

const EMPTY_LABEL_FIELDS = new Set([
  "source_chapter_label",
  "source_section_label",
  "source_subsection_label",
]);

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return identifier;
}

function sqlTextLiteral(value) {
  const normalized = text(value);
  if (!normalized) {
    return "null";
  }
  return `'${normalized.replaceAll("'", "''")}'`;
}

function sqlBooleanLiteral(value) {
  const normalized = text(value).toLowerCase();
  if (["1", "true", "yes", "是", "active"].includes(normalized)) {
    return "true";
  }
  if (["0", "false", "no", "否", "inactive"].includes(normalized)) {
    return "false";
  }
  if (!normalized) {
    return "null";
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

function sqlNumberLiteral(value, fieldName) {
  const normalized = text(value);
  if (!normalized) {
    return "null";
  }
  const pattern = INTEGER_FIELDS.has(fieldName) ? /^-?\d+$/ : /^-?\d+(?:\.\d+)?$/;
  if (!pattern.test(normalized)) {
    throw new Error(`Invalid numeric value for ${fieldName}: ${value}`);
  }
  return normalized;
}

function sqlValueLiteral(fieldName, value) {
  if (EMPTY_LABEL_FIELDS.has(fieldName) && text(value) === "空") {
    return "null";
  }
  if (BOOLEAN_FIELDS.has(fieldName)) {
    return sqlBooleanLiteral(value);
  }
  if (INTEGER_FIELDS.has(fieldName) || NUMERIC_FIELDS.has(fieldName)) {
    return sqlNumberLiteral(value, fieldName);
  }
  return sqlTextLiteral(value);
}

function rowValuesSql(columns, row, importSource) {
  const values = columns.map((column) => sqlValueLiteral(column, row[column]));
  values.push("now()");
  values.push(sqlTextLiteral(importSource));
  return `  (${values.join(", ")})`;
}

function buildUpsertSql(tableName, rows, options = {}) {
  if (!rows.length) {
    return `-- ${tableName}: 0 rows\n`;
  }

  const columns = TABLES[tableName];
  const keys = TABLE_KEYS[tableName];
  if (!columns || !keys) {
    throw new Error(`Unknown import table: ${tableName}`);
  }

  const importSource = options.importSource || "production-seed";
  const insertColumns = [...columns, "imported_at", "import_source"];
  const updateColumns = insertColumns.filter((column) => !keys.includes(column));

  return [
    `-- ${tableName}: ${rows.length} rows`,
    `insert into public.${quoteIdentifier(tableName)} (`,
    ...insertColumns.map((column, index) => `  ${quoteIdentifier(column)}${index === insertColumns.length - 1 ? "" : ","}`),
    ")",
    "values",
    rows.map((row) => rowValuesSql(columns, row, importSource)).join(",\n"),
    `on conflict (${keys.map(quoteIdentifier).join(", ")}) do update set`,
    updateColumns.map((column, index) => `  ${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}${index === updateColumns.length - 1 ? "" : ","}`).join("\n"),
    ";",
  ].join("\n");
}

function buildSeedImportSql(tables, options = {}) {
  const blocks = [
    "begin;",
    "set constraints all immediate;",
  ];

  for (const tableName of IMPORT_ORDER) {
    blocks.push(buildUpsertSql(tableName, tables[tableName] || [], options));
  }

  blocks.push("commit;");
  return `${blocks.join("\n\n")}\n`;
}

export function buildSeedImportPlan(tables, options = {}) {
  const validation = validateTables(tables);
  const errors = [...(options.readErrors || []), ...validation.errors];
  const tableCounts = Object.fromEntries(IMPORT_ORDER.map((tableName) => [
    tableName,
    Array.isArray(tables[tableName]) ? tables[tableName].length : 0,
  ]));

  if (errors.length > 0) {
    throw new Error(`Cannot import invalid public seed:\n${errors.join("\n")}`);
  }

  const importSource = options.importSource || "production-seed";
  return {
    tableOrder: [...IMPORT_ORDER],
    tableCounts,
    totalRows: Object.values(tableCounts).reduce((sum, count) => sum + count, 0),
    validation: {
      ...validation,
      errors,
    },
    sql: buildSeedImportSql(tables, { importSource }),
  };
}

export async function runPsql(sql, options) {
  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when --execute is used.");
  }

  const psqlBin = options.psqlBin || process.env.PSQL_BIN || "psql";
  await new Promise((resolve, reject) => {
    const child = spawn(psqlBin, [
      databaseUrl,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--quiet",
    ], {
      stdio: ["pipe", "inherit", "inherit"],
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code}`));
      }
    });

    child.stdin.end(sql, "utf8");
  });
}

function usage() {
  return [
    "Usage:",
    "  node scripts/import-production-seed.mjs [options]",
    "",
    "Options:",
    "  --input <xlsx>          Public seed workbook. Defaults to data/production-seed/math2_public_seed_v1.xlsx",
    "  --source <label>        Import source label stored in import_source. Defaults to workbook file name",
    "  --write-sql <path>      Write generated upsert SQL to a file for review",
    "  --execute               Execute SQL with psql. Without this flag the script is a dry run",
    "  --database-url <url>    PostgreSQL connection URL. Falls back to DATABASE_URL",
    "  --psql <path>           psql executable path. Falls back to PSQL_BIN or psql",
    "  --help                  Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    importSource: "",
    writeSql: "",
    execute: false,
    databaseUrl: process.env.DATABASE_URL || "",
    psqlBin: process.env.PSQL_BIN || "psql",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--input" && value) {
      args.input = path.resolve(value);
      index += 1;
    } else if (key === "--source" && value) {
      args.importSource = value;
      index += 1;
    } else if (key === "--write-sql" && value) {
      args.writeSql = path.resolve(value);
      index += 1;
    } else if (key === "--execute") {
      args.execute = true;
    } else if (key === "--database-url" && value) {
      args.databaseUrl = value;
      index += 1;
    } else if (key === "--psql" && value) {
      args.psqlBin = value;
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
  const importSource = args.importSource || path.basename(args.input);
  const plan = buildSeedImportPlan(tables, { importSource, readErrors });

  if (args.writeSql) {
    await fs.mkdir(path.dirname(args.writeSql), { recursive: true });
    await fs.writeFile(args.writeSql, plan.sql, "utf8");
  }

  if (args.execute) {
    await runPsql(plan.sql, {
      databaseUrl: args.databaseUrl,
      psqlBin: args.psqlBin,
    });
  }

  console.log(`${JSON.stringify({
    input: args.input,
    import_source: importSource,
    dry_run: !args.execute,
    executed: args.execute,
    wrote_sql: args.writeSql || null,
    table_counts: plan.tableCounts,
    total_rows: plan.totalRows,
    warnings: plan.validation.warnings,
    errors: plan.validation.errors,
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
