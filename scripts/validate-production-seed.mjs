import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");

const DEFAULT_INPUT = path.join(repoRoot, "data", "production-seed", "math2_public_seed_v1.xlsx");

export const TABLES = {
  plan_variants: [
    "plan_variant_id",
    "math_type",
    "review_order",
    "variant_name",
    "student_label",
    "description",
    "is_active",
    "version",
    "sort_order",
    "note",
  ],
  chapters: [
    "chapter_id",
    "math_type",
    "subject",
    "chapter_name",
    "chapter_alias",
    "is_active",
    "source_pdf",
    "source_pdf_page",
    "note",
  ],
  display_chapters: [
    "display_chapter_id",
    "math_type",
    "subject",
    "display_chapter_name",
    "art_label",
    "svg_filename",
    "sort_order",
    "is_active",
    "note",
  ],
  chapter_display_mappings: [
    "math_type",
    "chapter_id",
    "display_chapter_id",
    "display_sort_in_group",
    "is_active",
    "note",
  ],
  chapter_orders: [
    "plan_variant_id",
    "chapter_id",
    "chapter_sort",
    "chapter_code",
    "display_chapter_name",
    "is_active",
    "source_sheet",
    "source_pdf",
    "source_pdf_page",
    "note",
  ],
  question_types: [
    "type_id",
    "math_type",
    "chapter_id",
    "canonical_topic_id",
    "type_kind",
    "type_name",
    "card_type_label",
    "card_title",
    "importance_tag",
    "question_kind",
    "intro_title",
    "intro_body",
    "is_active",
    "source_section",
    "source_pdf",
    "source_pdf_page",
    "note",
  ],
  question_type_orders: [
    "plan_variant_id",
    "type_id",
    "type_sort_in_chapter",
    "final_type_label",
    "sort_code",
    "direct_assignable",
    "duration_130_days",
    "duration_100_days",
    "duration_80_days",
    "is_active",
    "source_type_id",
    "source_sheet",
    "duration_basis",
    "note",
  ],
  questions: [
    "question_id",
    "type_id",
    "book_id",
    "applicable_levels",
    "plan_stage",
    "original_position_text",
    "question_order",
    "display_permission",
    "is_active",
    "source_pdf",
    "source_pdf_page",
    "question_note",
    "book_display_label",
    "source_chapter_label",
    "source_section_label",
    "source_subsection_label",
    "source_question_label",
  ],
  chapter_summary_templates: [
    "summary_template_id",
    "math_type",
    "chapter_id",
    "plan_stage",
    "summary_title",
    "exam_focus",
    "key_points",
    "common_mistakes",
    "review_suggestions",
    "is_active",
    "note",
  ],
  exercise_books: [
    "book_id",
    "book_name",
    "book_type",
    "math_type",
    "plan_stage",
    "is_registration_selectable",
    "is_active",
    "sort_order",
    "note",
  ],
  institutions: [
    "school_id",
    "school_name",
    "school_tags",
    "province",
    "search_keywords",
    "sort_order",
  ],
  classes: [
    "class_id",
    "class_name",
    "math_type",
    "target_exam_year",
    "level",
    "teacher_user_id",
    "group_name",
    "qq_group_number",
    "capacity",
    "is_accepting_new_students",
    "is_test_class",
    "note",
  ],
  class_intake_settings: [
    "setting_id",
    "math_type",
    "level",
    "active_class_id",
    "is_active",
    "note",
  ],
};

const REQUIRED_FIELDS = {
  plan_variants: ["plan_variant_id", "math_type", "review_order", "variant_name", "student_label", "is_active", "version", "sort_order"],
  chapters: ["chapter_id", "math_type", "subject", "chapter_name", "is_active"],
  display_chapters: ["display_chapter_id", "math_type", "subject", "display_chapter_name", "art_label", "svg_filename", "sort_order", "is_active"],
  chapter_display_mappings: ["math_type", "chapter_id", "display_chapter_id", "display_sort_in_group", "is_active"],
  chapter_orders: ["plan_variant_id", "chapter_id", "chapter_sort", "chapter_code", "display_chapter_name", "is_active"],
  question_types: ["type_id", "math_type", "chapter_id", "type_kind", "type_name", "card_type_label", "card_title", "importance_tag", "question_kind", "intro_title", "intro_body", "is_active"],
  question_type_orders: ["plan_variant_id", "type_id", "type_sort_in_chapter", "final_type_label", "sort_code", "direct_assignable", "is_active"],
  questions: ["question_id", "type_id", "book_id", "applicable_levels", "plan_stage", "original_position_text", "question_order", "display_permission", "is_active", "book_display_label", "source_question_label"],
  chapter_summary_templates: ["summary_template_id", "math_type", "chapter_id", "plan_stage", "summary_title", "is_active"],
  exercise_books: ["book_id", "book_name", "book_type", "is_registration_selectable", "is_active", "sort_order"],
  institutions: ["school_id", "school_name", "school_tags", "province", "search_keywords", "sort_order"],
  classes: ["class_id", "class_name", "math_type", "target_exam_year", "level", "is_accepting_new_students", "is_test_class"],
  class_intake_settings: ["setting_id", "math_type", "level", "active_class_id", "is_active"],
};

const VALID_MATH_TYPES = new Set(["数学一", "数学二", "数学三"]);
const VALID_REVIEW_ORDERS = new Set(["mixed", "gaoshu_first"]);
const VALID_IMPORTANCE_TAGS = new Set(["必会", "重点", "易错", "拔高"]);
const VALID_QUESTION_KINDS = new Set(["计算题", "综合题", "概念题", "证明题", "应用题"]);
const VALID_LEVELS = new Set(["A", "B", "C", "D"]);

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function isTruthyFlag(value) {
  const normalized = text(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "是" || normalized === "active";
}

function isBooleanLike(value) {
  const normalized = text(value).toLowerCase();
  return ["", "0", "1", "true", "false", "yes", "no", "是", "否", "active", "inactive"].includes(normalized);
}

function isNonNegativeNumber(value) {
  const normalized = text(value);
  if (!normalized) {
    return true;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isIntegerLike(value) {
  const normalized = text(value);
  return /^-?\d+$/.test(normalized);
}

function duplicateKeys(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

function requireFields(errors, tableName, rows) {
  const fields = REQUIRED_FIELDS[tableName] || [];
  for (const [index, row] of rows.entries()) {
    for (const field of fields) {
      if (!text(row[field])) {
        errors.push(`${tableName}.${field} missing at row ${index + 2}`);
      }
    }
  }
}

function checkMathType(errors, tableName, rows) {
  for (const row of rows) {
    if (row.math_type && !VALID_MATH_TYPES.has(text(row.math_type))) {
      errors.push(`${tableName}.math_type invalid: ${text(row.math_type)}`);
    }
  }
}

function checkIntegerField(errors, tableName, rows, field) {
  for (const row of rows) {
    if (text(row[field]) && !isIntegerLike(row[field])) {
      errors.push(`${tableName}.${field} must be integer: ${text(row[field])}`);
    }
  }
}

function checkBooleanField(errors, tableName, rows, field) {
  for (const row of rows) {
    if (!isBooleanLike(row[field])) {
      errors.push(`${tableName}.${field} must be boolean-like: ${text(row[field])}`);
    }
  }
}

function checkDuplicate(errors, rows, label, keyFn) {
  for (const key of duplicateKeys(rows, keyFn)) {
    errors.push(`Duplicate ${label}: ${key}`);
  }
}

export function validateTables(tables) {
  const errors = [];
  const warnings = [];
  const normalizedTables = Object.fromEntries(
    Object.keys(TABLES).map((name) => [name, Array.isArray(tables[name]) ? tables[name] : []]),
  );

  for (const tableName of Object.keys(TABLES)) {
    if (!Array.isArray(tables[tableName])) {
      errors.push(`Missing sheet/table: ${tableName}`);
    }
    requireFields(errors, tableName, normalizedTables[tableName]);
  }

  const planVariantIds = new Set(normalizedTables.plan_variants.map((row) => text(row.plan_variant_id)));
  const chapterIds = new Set(normalizedTables.chapters.map((row) => text(row.chapter_id)));
  const displayChapterIds = new Set(normalizedTables.display_chapters.map((row) => text(row.display_chapter_id)));
  const typeIds = new Set(normalizedTables.question_types.map((row) => text(row.type_id)));
  const bookIds = new Set(normalizedTables.exercise_books.map((row) => text(row.book_id)));
  const classIds = new Set(normalizedTables.classes.map((row) => text(row.class_id)));

  checkDuplicate(errors, normalizedTables.plan_variants, "plan_variants.plan_variant_id", (row) => text(row.plan_variant_id));
  checkDuplicate(errors, normalizedTables.plan_variants, "plan_variants math_type/review_order", (row) => `${text(row.math_type)}||${text(row.review_order)}`);
  checkDuplicate(errors, normalizedTables.chapters, "chapters.chapter_id", (row) => text(row.chapter_id));
  checkDuplicate(errors, normalizedTables.chapters, "chapters math_type/chapter_name", (row) => `${text(row.math_type)}||${text(row.chapter_name)}`);
  checkDuplicate(errors, normalizedTables.display_chapters, "display_chapters.display_chapter_id", (row) => text(row.display_chapter_id));
  checkDuplicate(errors, normalizedTables.display_chapters, "display_chapters math_type/sort_order", (row) => `${text(row.math_type)}||${text(row.sort_order)}`);
  checkDuplicate(errors, normalizedTables.chapter_display_mappings, "chapter_display_mappings math_type/chapter_id", (row) => `${text(row.math_type)}||${text(row.chapter_id)}`);
  checkDuplicate(errors, normalizedTables.chapter_orders, "chapter_orders plan_variant_id/chapter_id", (row) => `${text(row.plan_variant_id)}||${text(row.chapter_id)}`);
  checkDuplicate(errors, normalizedTables.chapter_orders, "chapter_orders plan_variant_id/chapter_sort", (row) => `${text(row.plan_variant_id)}||${text(row.chapter_sort)}`);
  checkDuplicate(errors, normalizedTables.question_types, "question_types.type_id", (row) => text(row.type_id));
  checkDuplicate(errors, normalizedTables.question_types, "question_types chapter_id/card_type_label", (row) => `${text(row.chapter_id)}||${text(row.card_type_label)}`);
  checkDuplicate(errors, normalizedTables.question_type_orders, "question_type_orders plan_variant_id/type_id", (row) => `${text(row.plan_variant_id)}||${text(row.type_id)}`);
  checkDuplicate(errors, normalizedTables.question_type_orders, "question_type_orders plan_variant_id/sort_code", (row) => `${text(row.plan_variant_id)}||${text(row.sort_code)}`);
  checkDuplicate(errors, normalizedTables.questions, "questions.question_id", (row) => text(row.question_id));
  checkDuplicate(errors, normalizedTables.chapter_summary_templates, "chapter_summary_templates.summary_template_id", (row) => text(row.summary_template_id));
  checkDuplicate(errors, normalizedTables.chapter_summary_templates, "chapter_summary_templates math_type/chapter_id/plan_stage", (row) => `${text(row.math_type)}||${text(row.chapter_id)}||${text(row.plan_stage)}`);
  checkDuplicate(errors, normalizedTables.exercise_books, "exercise_books.book_id", (row) => text(row.book_id));
  checkDuplicate(errors, normalizedTables.institutions, "institutions.school_id", (row) => text(row.school_id));
  checkDuplicate(errors, normalizedTables.institutions, "institutions.school_name", (row) => text(row.school_name));
  checkDuplicate(errors, normalizedTables.institutions, "institutions.sort_order", (row) => text(row.sort_order));
  checkDuplicate(errors, normalizedTables.classes, "classes.class_id", (row) => text(row.class_id));
  checkDuplicate(errors, normalizedTables.class_intake_settings, "class_intake_settings.setting_id", (row) => text(row.setting_id));
  checkDuplicate(
    errors,
    normalizedTables.class_intake_settings.filter((row) => isTruthyFlag(row.is_active)),
    "active class_intake_settings math_type/level",
    (row) => `${text(row.math_type)}||${text(row.level)}`,
  );

  for (const tableName of ["plan_variants", "chapters", "display_chapters", "chapter_display_mappings", "question_types", "chapter_summary_templates", "exercise_books", "classes", "class_intake_settings"]) {
    checkMathType(errors, tableName, normalizedTables[tableName]);
  }

  for (const row of normalizedTables.plan_variants) {
    if (!VALID_REVIEW_ORDERS.has(text(row.review_order))) {
      errors.push(`plan_variants.review_order invalid: ${text(row.plan_variant_id)}`);
    }
  }

  for (const row of normalizedTables.chapter_orders) {
    if (!planVariantIds.has(text(row.plan_variant_id))) {
      errors.push(`chapter_orders.plan_variant_id missing in plan_variants: ${text(row.plan_variant_id)}`);
    }
    if (!chapterIds.has(text(row.chapter_id))) {
      errors.push(`chapter_orders.chapter_id missing in chapters: ${text(row.chapter_id)}`);
    }
  }

  for (const row of normalizedTables.chapter_display_mappings) {
    if (!chapterIds.has(text(row.chapter_id))) {
      errors.push(`chapter_display_mappings.chapter_id missing in chapters: ${text(row.chapter_id)}`);
    }
    if (!displayChapterIds.has(text(row.display_chapter_id))) {
      errors.push(`chapter_display_mappings.display_chapter_id missing in display_chapters: ${text(row.display_chapter_id)}`);
    }
  }

  for (const row of normalizedTables.question_types) {
    if (!chapterIds.has(text(row.chapter_id))) {
      errors.push(`question_types.chapter_id missing in chapters: ${text(row.type_id)}`);
    }
    if (!VALID_IMPORTANCE_TAGS.has(text(row.importance_tag))) {
      errors.push(`question_types.importance_tag invalid: ${text(row.type_id)}`);
    }
    if (!VALID_QUESTION_KINDS.has(text(row.question_kind))) {
      errors.push(`question_types.question_kind invalid: ${text(row.type_id)}`);
    }
    if (!/^\u9898\u578b[1-9]\d*$/.test(text(row.card_type_label))) {
      errors.push(`question_types.card_type_label invalid: ${text(row.type_id)}`);
    }
  }

  for (const row of normalizedTables.question_type_orders) {
    if (!planVariantIds.has(text(row.plan_variant_id))) {
      errors.push(`question_type_orders.plan_variant_id missing in plan_variants: ${text(row.plan_variant_id)}`);
    }
    if (!typeIds.has(text(row.type_id))) {
      errors.push(`question_type_orders.type_id missing in question_types: ${text(row.type_id)}`);
    }
    for (const field of ["duration_130_days", "duration_100_days", "duration_80_days"]) {
      if (!isNonNegativeNumber(row[field])) {
        errors.push(`question_type_orders.${field} must be non-negative number: ${text(row.plan_variant_id)}||${text(row.type_id)}`);
      }
    }
  }

  for (const row of normalizedTables.questions) {
    if (!typeIds.has(text(row.type_id))) {
      errors.push(`questions.type_id missing in question_types: ${text(row.question_id)}`);
    }
    if (!bookIds.has(text(row.book_id))) {
      errors.push(`questions.book_id missing in exercise_books: ${text(row.question_id)}`);
    }
  }

  for (const row of normalizedTables.chapter_summary_templates) {
    if (!chapterIds.has(text(row.chapter_id))) {
      errors.push(`chapter_summary_templates.chapter_id missing in chapters: ${text(row.summary_template_id)}`);
    }
    if (isTruthyFlag(row.is_active) && (!text(row.exam_focus) || !text(row.key_points) || !text(row.common_mistakes))) {
      warnings.push(`chapter_summary_templates core fields incomplete: ${text(row.summary_template_id)}`);
    }
  }

  for (const row of normalizedTables.classes) {
    if (!VALID_LEVELS.has(text(row.level))) {
      errors.push(`classes.level invalid: ${text(row.class_id)}`);
    }
    if (text(row.math_type) === "数学二" && (!text(row.class_id).startsWith(text(row.level)) || text(row.class_id)[1] !== "2")) {
      errors.push(`classes.class_id mismatch with level/math_type: ${text(row.class_id)}`);
    }
    if (text(row.capacity) && (!isIntegerLike(row.capacity) || Number(row.capacity) <= 0)) {
      errors.push(`classes.capacity must be positive integer: ${text(row.class_id)}`);
    }
  }

  for (const row of normalizedTables.class_intake_settings) {
    if (!VALID_LEVELS.has(text(row.level))) {
      errors.push(`class_intake_settings.level invalid: ${text(row.setting_id)}`);
    }
    if (!classIds.has(text(row.active_class_id))) {
      errors.push(`class_intake_settings.active_class_id missing in classes: ${text(row.setting_id)}`);
    }
    const targetClass = normalizedTables.classes.find((classRow) => text(classRow.class_id) === text(row.active_class_id));
    if (targetClass && !isTruthyFlag(targetClass.is_accepting_new_students)) {
      warnings.push(`class_intake_settings.active_class_id is not accepting new students: ${text(row.setting_id)}`);
    }
  }

  for (const [tableName, fields] of Object.entries({
    plan_variants: ["is_active"],
    chapters: ["is_active"],
    display_chapters: ["is_active"],
    chapter_display_mappings: ["is_active"],
    chapter_orders: ["is_active"],
    question_types: ["is_active"],
    question_type_orders: ["direct_assignable", "is_active"],
    questions: ["is_active"],
    chapter_summary_templates: ["is_active"],
    exercise_books: ["is_registration_selectable", "is_active"],
    classes: ["is_accepting_new_students", "is_test_class"],
    class_intake_settings: ["is_active"],
  })) {
    for (const field of fields) {
      checkBooleanField(errors, tableName, normalizedTables[tableName], field);
    }
  }

  for (const [tableName, fields] of Object.entries({
    plan_variants: ["sort_order"],
    display_chapters: ["sort_order"],
    chapter_display_mappings: ["display_sort_in_group"],
    chapter_orders: ["chapter_sort"],
    question_type_orders: ["type_sort_in_chapter"],
    questions: ["question_order"],
    exercise_books: ["sort_order"],
    institutions: ["sort_order"],
    classes: ["target_exam_year"],
  })) {
    for (const field of fields) {
      checkIntegerField(errors, tableName, normalizedTables[tableName], field);
    }
  }

  return {
    table_counts: Object.fromEntries(Object.entries(normalizedTables).map(([name, rows]) => [name, rows.length])),
    errors,
    warnings,
  };
}

function rowObjects(values) {
  if (!values || values.length === 0) {
    return [];
  }
  const headers = values[0].map(text);
  return values.slice(1).map((row) => {
    const result = {};
    headers.forEach((header, index) => {
      result[header] = text(row[index]);
    });
    return result;
  }).filter((row) => Object.values(row).some(Boolean));
}

async function loadArtifactTool() {
  try {
    return await import("@oai/artifact-tool");
  } catch (packageError) {
    const entry = process.env.ARTIFACT_TOOL_ENTRY;
    if (!entry) throw packageError;
    return await import(pathToFileURL(entry).href);
  }
}

function readWorkbookTablesWithArtifactTool(inputPath) {
  return (async () => {
  const { FileBlob, SpreadsheetFile } = await loadArtifactTool();
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
  const tables = {};
  const readErrors = [];

  for (const [tableName, expectedHeaders] of Object.entries(TABLES)) {
    try {
      const sheet = workbook.worksheets.getItem(tableName);
      const values = sheet.getUsedRange().values;
      const headers = values[0].map(text);
      for (const header of expectedHeaders) {
        if (!headers.includes(header)) {
          readErrors.push(`${tableName}.${header} header missing`);
        }
      }
      tables[tableName] = rowObjects(values);
    } catch (error) {
      tables[tableName] = [];
      readErrors.push(`Missing sheet/table: ${tableName}`);
    }
  }

  return { tables, readErrors };
  })();
}

function pythonReaderScript() {
  return String.raw`
import json
import sys

import openpyxl

input_path = sys.argv[1]
expected_tables = json.loads(sys.argv[2])

def text(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value).strip()

def row_objects(values):
    if not values:
        return []
    headers = [text(value) for value in values[0]]
    rows = []
    for raw_row in values[1:]:
        row = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            row[header] = text(raw_row[index]) if index < len(raw_row) else ""
        if any(row.values()):
            rows.append(row)
    return rows

workbook = openpyxl.load_workbook(input_path, read_only=True, data_only=True)
tables = {}
read_errors = []

for table_name, expected_headers in expected_tables.items():
    if table_name not in workbook.sheetnames:
        tables[table_name] = []
        read_errors.append(f"Missing sheet/table: {table_name}")
        continue

    worksheet = workbook[table_name]
    values = [list(row) for row in worksheet.iter_rows(values_only=True)]
    if not values:
        tables[table_name] = []
        read_errors.append(f"Missing sheet/table: {table_name}")
        continue

    headers = [text(value) for value in values[0]]
    for header in expected_headers:
        if header not in headers:
            read_errors.append(f"{table_name}.{header} header missing")
    tables[table_name] = row_objects(values)

payload = {"tables": tables, "readErrors": read_errors}
sys.stdout.buffer.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
`;
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
      return await new Promise((resolve, reject) => {
        const child = spawn(pythonBin, args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
        const stdout = [];
        const stderr = [];

        child.stdout.on("data", (chunk) => stdout.push(chunk));
        child.stderr.on("data", (chunk) => stderr.push(chunk));
        child.on("error", reject);
        child.on("close", (code) => {
          const stderrText = Buffer.concat(stderr).toString("utf8").trim();
          if (code !== 0) {
            reject(new Error(`${pythonBin} exited with code ${code}${stderrText ? `: ${stderrText}` : ""}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));
          } catch (error) {
            reject(new Error(`Could not parse ${pythonBin} JSON output: ${error.message}`));
          }
        });
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Python workbook reader failed: ${lastError?.message || "python not found"}`);
}

async function readWorkbookTablesWithPython(inputPath) {
  return await runPythonJson([
    "-c",
    pythonReaderScript(),
    inputPath,
    JSON.stringify(TABLES),
  ]);
}

export async function readWorkbookTables(inputPath) {
  if (process.env.PUBLIC_SEED_XLSX_READER === "python") {
    return await readWorkbookTablesWithPython(inputPath);
  }

  try {
    return await readWorkbookTablesWithArtifactTool(inputPath);
  } catch (artifactError) {
    if (process.env.PUBLIC_SEED_XLSX_READER === "artifact") {
      throw artifactError;
    }
    try {
      return await readWorkbookTablesWithPython(inputPath);
    } catch (pythonError) {
      throw new Error([
        "Unable to read workbook with artifact-tool or Python fallback.",
        `artifact-tool error: ${artifactError.message}`,
        `python fallback error: ${pythonError.message}`,
      ].join("\n"));
    }
  }
}

export async function validateWorkbook(inputPath = DEFAULT_INPUT) {
  const { tables, readErrors } = await readWorkbookTables(inputPath);
  const result = validateTables(tables);
  return {
    input: inputPath,
    generated_at: new Date().toISOString(),
    table_counts: result.table_counts,
    errors: [...readErrors, ...result.errors],
    warnings: result.warnings,
  };
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    report: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--input" && value) {
      args.input = path.resolve(value);
      index += 1;
    } else if (key === "--report" && value) {
      args.report = path.resolve(value);
      index += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await validateWorkbook(args.input);
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.report) {
    await fs.mkdir(path.dirname(args.report), { recursive: true });
    await fs.writeFile(args.report, output, "utf8");
  }
  if (report.errors.length > 0) {
    console.error(output);
    process.exitCode = 1;
    return;
  }
  console.log(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
