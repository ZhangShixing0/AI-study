import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  IMPORT_ORDER,
  buildSeedImportPlan,
} from "./import-production-seed.mjs";

function minimalTables() {
  return {
    plan_variants: [{
      plan_variant_id: "math2_mixed",
      math_type: "数学二",
      review_order: "mixed",
      variant_name: "数二穿插版",
      student_label: "穿插版",
      description: "高数线代穿插",
      is_active: "1",
      version: "2026-v1",
      sort_order: "1",
      note: "包含单引号 O'Reilly",
    }],
    chapters: [{
      chapter_id: "M2-CH-0001",
      math_type: "数学二",
      subject: "高等数学",
      chapter_name: "极限",
      chapter_alias: "",
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
    institutions: [{
      school_id: "SCH-10001",
      school_name: "测试'大学",
      school_tags: "一本,非双一流",
      province: "北京",
      search_keywords: "测试大学 北京",
      sort_order: "1",
    }],
    classes: [{
      class_id: "A201",
      class_name: "数学二A班",
      math_type: "数学二",
      target_exam_year: "2027",
      level: "A",
      teacher_user_id: "",
      group_name: "A班QQ群",
      qq_group_number: "746056792",
      capacity: "300",
      is_accepting_new_students: "1",
      is_test_class: "0",
    }],
    question_types: [{
      type_id: "M2-QT-0001",
      card_type_label: "\u9898\u578b1",
      math_type: "数学二",
      chapter_id: "M2-CH-0001",
      canonical_topic_id: "",
      type_kind: "题型",
      type_name: "等价无穷小",
      card_title: "题型1｜等价无穷小",
      importance_tag: "必会",
      question_kind: "计算题",
      intro_title: "极限基本功",
      intro_body: "熟练掌握等价无穷小替换。",
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
      source_subsection_label: "空",
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
      review_suggestions: "",
      is_active: "1",
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

test("builds an upsert transaction in foreign-key-safe order", () => {
  const plan = buildSeedImportPlan(minimalTables(), { importSource: "unit-test.xlsx" });

  assert.deepEqual(plan.tableOrder, IMPORT_ORDER);
  assert.equal(plan.totalRows, 13);
  assert.deepEqual(plan.validation.errors, []);

  const sql = plan.sql;
  assert.match(sql, /^begin;/);
  assert.match(sql, /commit;\s*$/);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);

  assert.ok(sql.indexOf("insert into public.plan_variants") < sql.indexOf("insert into public.question_types"));
  assert.ok(sql.indexOf("insert into public.chapters") < sql.indexOf("insert into public.question_types"));
  assert.ok(sql.indexOf("insert into public.chapters") < sql.indexOf("insert into public.chapter_display_mappings"));
  assert.ok(sql.indexOf("insert into public.display_chapters") < sql.indexOf("insert into public.chapter_display_mappings"));
  assert.ok(sql.indexOf("insert into public.exercise_books") < sql.indexOf("insert into public.questions"));
  assert.ok(sql.indexOf("insert into public.classes") < sql.indexOf("insert into public.class_intake_settings"));

  assert.match(sql, /on conflict \(plan_variant_id\) do update/);
  assert.match(sql, /on conflict \(display_chapter_id\) do update/);
  assert.match(sql, /on conflict \(math_type, chapter_id\) do update/);
  assert.match(sql, /on conflict \(plan_variant_id, chapter_id\) do update/);
  assert.match(sql, /duration_100_days,\n\s+duration_80_days/);
  assert.match(sql, /card_type_label/);
  assert.match(sql, /\('math2_mixed', 'M2-QT-0001', 1, '题型一', '001', true, 0\.50, 0\.60, 0\.75, true/);
  assert.match(sql, /'测试''大学'/);
  assert.match(sql, /'unit-test\.xlsx'/);
});

test("refuses to build import SQL when validation fails", () => {
  const tables = minimalTables();
  tables.questions[0].book_id = "missing_book";

  assert.throws(
    () => buildSeedImportPlan(tables, { importSource: "bad.xlsx" }),
    /Cannot import invalid public seed/,
  );
});

test("postgres public schema stores the card type label", () => {
  const schema = fs.readFileSync("data/production-seed/postgres_schema.sql", "utf8");

  assert.match(schema, /card_type_label\s+text\s+not\s+null/i);
});
