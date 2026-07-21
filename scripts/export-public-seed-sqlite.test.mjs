import assert from "node:assert/strict";

import {
  sqliteValue,
  createTableSql,
} from "./export-public-seed-sqlite.mjs";

assert.equal(sqliteValue("is_active", "是"), "1");
assert.equal(sqliteValue("is_active", "true"), "1");
assert.equal(sqliteValue("is_active", "否"), "0");
assert.equal(sqliteValue("is_active", ""), "");
assert.equal(sqliteValue("sort_order", "3"), "3");
assert.equal(sqliteValue("source_section", null), "");

const questionTypeSql = createTableSql("question_types", ["type_id", "type_name", "is_active"], ["type_id"]);
assert.match(questionTypeSql, /CREATE TABLE IF NOT EXISTS "question_types"/);
assert.match(questionTypeSql, /"type_id" TEXT/);
assert.match(questionTypeSql, /PRIMARY KEY \("type_id"\)/);

const mappingSql = createTableSql("chapter_display_mappings", ["math_type", "chapter_id"], ["math_type", "chapter_id"]);
assert.match(mappingSql, /PRIMARY KEY \("math_type", "chapter_id"\)/);

console.log("export public seed sqlite helpers ok");
