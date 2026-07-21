import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { readWorkbookTables, validateTables } from "./validate-production-seed.mjs";

function validTables() {
  return {
    plan_variants: [{
      plan_variant_id: "math2_mixed",
      math_type: "数学二",
      review_order: "mixed",
      variant_name: "数二穿插版",
      student_label: "穿插版",
      is_active: "1",
      version: "2026-v1",
      sort_order: "1",
    }],
    chapters: [{
      chapter_id: "M2-CH-0001",
      math_type: "数学二",
      subject: "高等数学",
      chapter_name: "极限",
      is_active: "1",
    }],
    display_chapters: [{
      display_chapter_id: "math2-limit",
      math_type: "数学二",
      subject: "高等数学",
      display_chapter_name: "极限",
      art_label: "极限",
      svg_filename: "01-limit.svg",
      sort_order: "1",
      is_active: "1",
    }],
    chapter_display_mappings: [{
      math_type: "数学二",
      chapter_id: "M2-CH-0001",
      display_chapter_id: "math2-limit",
      display_sort_in_group: "1",
      is_active: "1",
    }],
    chapter_orders: [{
      plan_variant_id: "math2_mixed",
      chapter_id: "M2-CH-0001",
      chapter_sort: "1",
      chapter_code: "G-01",
      display_chapter_name: "极限",
      is_active: "1",
    }],
    question_types: [{
      type_id: "M2-QT-0001",
      card_type_label: "\u9898\u578b1",
      math_type: "数学二",
      chapter_id: "M2-CH-0001",
      type_kind: "题型",
      type_name: "等价无穷小",
      card_title: "题型1｜等价无穷小",
      importance_tag: "必会",
      question_kind: "计算题",
      intro_title: "极限基本功",
      intro_body: "熟练掌握等价无穷小替换。",
      is_active: "1",
    }],
    question_type_orders: [{
      plan_variant_id: "math2_mixed",
      type_id: "M2-QT-0001",
      type_sort_in_chapter: "1",
      final_type_label: "题型一",
      sort_code: "001",
      direct_assignable: "1",
      duration_130_days: "0.50",
      duration_100_days: "0.60",
      duration_80_days: "0.75",
      is_active: "1",
    }],
    exercise_books: [{
      book_id: "m2_880",
      book_name: "880题",
      book_type: "主选",
      math_type: "数学二",
      plan_stage: "强化",
      is_registration_selectable: "1",
      is_active: "1",
      sort_order: "1",
    }],
    questions: [{
      question_id: "M2-880-001",
      type_id: "M2-QT-0001",
      book_id: "m2_880",
      applicable_levels: "A,B,C,D",
      plan_stage: "强化",
      original_position_text: "880题 第1题",
      question_order: "1",
      display_permission: "仅显示题号",
      is_active: "1",
      book_display_label: "《880》",
      source_chapter_label: "第一章",
      source_section_label: "基础",
      source_subsection_label: "选择",
      source_question_label: "第1题",
    }],
    chapter_summary_templates: [{
      summary_template_id: "M2-SUM-0001",
      math_type: "数学二",
      chapter_id: "M2-CH-0001",
      plan_stage: "强化",
      summary_title: "极限小结",
      exam_focus: "常考极限计算。",
      key_points: "掌握等价替换。",
      common_mistakes: "误用等价替换。",
      is_active: "1",
    }],
    institutions: [{
      school_id: "SCH-10001",
      school_name: "北京大学",
      school_tags: "985,211,双一流",
      province: "北京",
      search_keywords: "北京大学 北大 北京",
      sort_order: "1",
    }],
    classes: [{
      class_id: "A201",
      class_name: "数学二A班",
      math_type: "数学二",
      target_exam_year: "2027",
      level: "A",
      qq_group_number: "746056792",
      capacity: "300",
      is_accepting_new_students: "1",
      is_test_class: "0",
    }],
    class_intake_settings: [{
      setting_id: "math2_A_current",
      math_type: "数学二",
      level: "A",
      active_class_id: "A201",
      is_active: "1",
    }],
  };
}

test("accepts a valid minimal public seed table set", () => {
  const result = validateTables(validTables());
  assert.deepEqual(result.errors, []);
});

test("rejects invalid enums, duplicate institution names, and missing foreign keys", () => {
  const tables = validTables();
  tables.plan_variants[0].review_order = "linear_first";
  tables.question_types[0].importance_tag = "普通";
  tables.questions[0].book_id = "missing_book";
  tables.institutions.push({
    ...tables.institutions[0],
    school_id: "SCH-10002",
    sort_order: "2",
  });

  const result = validateTables(tables);

  assert.match(result.errors.join("\n"), /plan_variants\.review_order invalid/);
  assert.match(result.errors.join("\n"), /question_types\.importance_tag invalid/);
  assert.match(result.errors.join("\n"), /questions\.book_id missing in exercise_books/);
  assert.match(result.errors.join("\n"), /Duplicate institutions\.school_name/);
});

test("rejects duplicate chapter-local card type labels", () => {
  const tables = validTables();
  tables.question_types.push({
    ...tables.question_types[0],
    type_id: "M2-QT-0002",
  });

  const result = validateTables(tables);

  assert.match(result.errors.join("\n"), /Duplicate question_types chapter_id\/card_type_label/);
});

test("reads the production workbook through the python fallback when artifact-tool is unavailable", async () => {
  const previousReader = process.env.PUBLIC_SEED_XLSX_READER;
  const previousArtifactEntry = process.env.ARTIFACT_TOOL_ENTRY;
  process.env.PUBLIC_SEED_XLSX_READER = "python";
  process.env.ARTIFACT_TOOL_ENTRY = path.resolve("missing-artifact-tool.mjs");

  try {
    const { tables, readErrors } = await readWorkbookTables(
      path.resolve("data", "production-seed", "math2_public_seed_v1.xlsx"),
    );

    assert.deepEqual(readErrors, []);
    assert.equal(tables.plan_variants.length, 2);
    assert.equal(tables.questions.length, 2730);
  } finally {
    if (previousReader === undefined) {
      delete process.env.PUBLIC_SEED_XLSX_READER;
    } else {
      process.env.PUBLIC_SEED_XLSX_READER = previousReader;
    }
    if (previousArtifactEntry === undefined) {
      delete process.env.ARTIFACT_TOOL_ENTRY;
    } else {
      process.env.ARTIFACT_TOOL_ENTRY = previousArtifactEntry;
    }
  }
});
