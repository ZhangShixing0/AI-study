# student_runtime_tables_v1 运行表与 API 字段口径

最后更新：2026-06-28

适用范围：学生端正式上线时，注册完成之后的每日计划、反馈提交、成长页统计、章节总结和自习热力图。

本文档不是新的公共 Excel。`math2_public_seed_v1.xlsx` 维护的是公共只读数据；本文档维护的是 PostgreSQL 运行时学生数据表和前后端字段口径。正式运行时，公共表和运行表都在 PostgreSQL 中，Excel 只作为公共 seed 的人工维护和批量导入模板。

## 1. 边界

公共 seed 表负责：

| 数据 | 来源 |
| --- | --- |
| 复习方案、章节、题型、题目、章节总结模板 | `math2_public_seed_v1.xlsx` |
| 习题册、院校、班级入口配置 | `math2_public_seed_v1.xlsx` |
| 成长页展示章节和原始章节映射 | `display_chapters`、`chapter_display_mappings` |

运行表负责：

| 表 | 作用 |
| --- | --- |
| `daily_plans` | 学生每天实际生成了哪些计划题目 |
| `question_feedbacks` | 学生每道题的提交结果和错因原始记录 |
| `type_mastery_stats` | 每次提交题型后生成的掌握度快照 |
| `loss_reason_stats` | 每次提交题型后生成的错因比例快照 |
| `student_daily_activity` | 每日学习和刷题统计缓存 |
| `student_chapter_completions` | 原始章节完成记录和章节小结个人数据 |

第一批不做：

- `priority_recommendations`：v3.2 已删除成长页“最该优先补强题型/章节”。
- 复杂徽章系统表：后续做可领取徽章、历史徽章墙、发放流水时再单独设计；第一批“勋章进度”由连续完成今日反馈天数实时生成。
- 学生行为日志全量分析表：第一批只保证正式页面需要的数据闭环。

## 2. 核心规则

### 2.1 提交粒度

学生提交一次题型反馈时，后端生成一个 `type_submission_id`。同一次提交里的多道题在 `question_feedbacks` 中保存多行，并用同一个 `type_submission_id` 关联。

同一个学生、同一天、同一个题型只允许最终提交一次。提交后不允许修改或重新提交。如果后续需要纠错，只能由管理员走后台更正流程，并记录审计日志。

### 2.2 `result` 和未作题

`question_feedbacks.result` 只允许：

| 值 | 含义 |
| --- | --- |
| `correct` | 做对 |
| `wrong` | 做错 |
| `unattempted` | 未作 |

`unattempted` 必须再看 `unattempted_action`：

| `unattempted_action` | 业务含义 | 是否计入完成 | 是否计入错题 |
| --- | --- | --- | --- |
| `mark_wrong` | 学生选择跳过未完成，按错题处理 | 是 | 是 |
| `defer` | 今天不完成，明天继续布置 | 否 | 否 |
| 空值 | 非未作题 | 按 `result` 判断 | 按 `result` 判断 |

正式统计口径：

```text
is_wrong_record = result == "wrong"
  OR (result == "unattempted" AND unattempted_action == "mark_wrong")
```

`unattempted + defer` 不进入正确率分母，也不进入错因统计，但它会让当前题型保持未完成，并进入后续计划。

### 2.3 原始章节和展示章节

今日计划、题型推进、章节完成、章节总结都使用原始 `chapter_id`。

成长页章节掌握度使用 `display_chapter_id` 展示。`type_mastery_stats` 应同时保存 `chapter_id` 和 `display_chapter_id`，这样前端可以直接按展示章节聚合，也可以回查原始章节。

### 2.4 快照表不是原始事实

`question_feedbacks` 是原始事实表。`type_mastery_stats`、`loss_reason_stats`、`student_daily_activity` 是可重算的统计快照或缓存。

如果后续统计规则变更，可以从 `question_feedbacks`、`daily_plans`、`focus_sessions` 重新生成统计表。

## 3. 运行表字段

### 3.1 `daily_plans`

作用：记录某个学生某天实际布置的题目。一行是一道计划题，不是一整个题型。

建议主键：`plan_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `plan_id` | `text` | 每道计划题的稳定 ID |
| `user_id` | `text` | 学生 ID |
| `plan_date` | `date` | 计划日期 |
| `math_type` | `text` | 数学类型，例如 `数学二` |
| `plan_variant_id` | `text` | 学生选择的复习方案 |
| `plan_stage` | `text` | 阶段，例如 `强化` |
| `chapter_id` | `text` | 原始章节 ID |
| `display_chapter_id` | `text` | 成长页展示章节 ID |
| `type_id` | `text` | 题型 ID |
| `question_id` | `text` | 题目 ID |
| `book_id` | `text` | 题源书目 ID |
| `type_order_in_day` | `integer` | 当天题型展示顺序 |
| `question_order` | `integer` | 同一题型内题目顺序 |
| `plan_status` | `text` | `planned` / `completed` / `deferred` / `cancelled` |
| `feedback_open_status` | `text` | `locked` / `open` / `submitted` |
| `deferred_from_plan_id` | `text` | 如果是延期题，记录上一天的计划题 ID |
| `generated_at` | `timestamptz` | 计划生成时间 |
| `completed_at` | `timestamptz` | 完成时间 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

约束建议：

- `question_id` 必须存在于 `questions`。
- `type_id` 必须存在于 `question_types`。
- 同一学生同一天的 `type_order_in_day + question_order` 应稳定。
- `deferred_from_plan_id` 只用于追踪延期链，不用于公共 seed。

### 3.2 `question_feedbacks`

作用：保存学生每道题的提交结果。它是做题反馈、错题导出、错因统计、掌握度统计的原始事实表。

建议主键：`feedback_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `feedback_id` | `text` | 单道题反馈 ID |
| `type_submission_id` | `text` | 同一次题型提交的分组 ID |
| `user_id` | `text` | 学生 ID |
| `plan_id` | `text` | 对应 `daily_plans.plan_id` |
| `plan_date` | `date` | 计划日期 |
| `math_type` | `text` | 数学类型 |
| `plan_variant_id` | `text` | 复习方案 |
| `plan_stage` | `text` | 阶段 |
| `chapter_id` | `text` | 原始章节 ID |
| `display_chapter_id` | `text` | 展示章节 ID |
| `type_id` | `text` | 题型 ID |
| `question_id` | `text` | 题目 ID |
| `book_id` | `text` | 题源书目 ID |
| `result` | `text` | `correct` / `wrong` / `unattempted` |
| `unattempted_action` | `text` | `mark_wrong` / `defer` / 空值 |
| `is_wrong_record` | `boolean` | 是否按错题统计 |
| `wrong_reason_code` | `text` | 错因 code |
| `wrong_reason_name` | `text` | 错因展示名 |
| `wrong_reason_note` | `text` | 学生或系统备注，可选 |
| `submitted_at` | `timestamptz` | 本次题型反馈提交时间 |
| `created_at` | `timestamptz` | 创建时间 |

约束建议：

- `result` 必须在 `correct / wrong / unattempted` 中。
- `result=wrong` 时，`wrong_reason_code` 必填。
- `result=unattempted` 时，`unattempted_action` 必填。
- `unattempted_action=mark_wrong` 时，应要求选择错因。
- `unattempted_action=defer` 时，不要求错因。
- 同一 `type_submission_id` 下可以有多行题目反馈。
- 同一学生同一计划题不允许重复提交。

错题导出：

- 不需要在 `loss_reason_stats` 里保存题目 ID。
- 强化阶段结束导出学生全部错题时，从 `question_feedbacks` 查询 `is_wrong_record=1`，再关联 `questions`、`question_types`、`exercise_books`。

### 3.3 `type_mastery_stats`

作用：每次提交题型后生成掌握度快照。前端成长页实时变化的章节掌握度从这里读取，必要时可从 `question_feedbacks` 重算。

建议主键：`mastery_stat_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `mastery_stat_id` | `text` | 快照行 ID |
| `type_submission_id` | `text` | 触发本次快照的提交 ID |
| `snapshot_seq` | `integer` | 学生维度下第几次题型提交快照 |
| `snapshot_at` | `timestamptz` | 快照生成时间 |
| `user_id` | `text` | 学生 ID |
| `math_type` | `text` | 数学类型 |
| `plan_variant_id` | `text` | 复习方案 |
| `plan_stage` | `text` | 阶段 |
| `chapter_id` | `text` | 原始章节 ID |
| `display_chapter_id` | `text` | 成长页展示章节 ID |
| `type_id` | `text` | 被统计的题型 ID |
| `trigger_type_id` | `text` | 本次提交的题型 ID |
| `submitted_question_count` | `integer` | 该题型累计进入分母的题数 |
| `correct_question_count` | `integer` | 该题型累计正确题数 |
| `wrong_question_count` | `integer` | 该题型累计错题数 |
| `mastery_rate` | `numeric(5,2)` | 掌握度百分比，建议存真实小数 |
| `mastery_level` | `text` | 可选，如 `weak` / `normal` / `good` |
| `created_at` | `timestamptz` | 创建时间 |

统计口径：

- `correct`：进入分母，计正确。
- `wrong`：进入分母，计错误。
- `unattempted + mark_wrong`：进入分母，计错误。
- `unattempted + defer`：不进入分母，不计错误。

展示口径：

- 前端可以按 `display_chapter_id` 聚合多个原始章节。
- 掌握度每提交一个题型就实时变化，不等整章完成。
- 如果某个展示章节没有任何进入分母的题目，前端显示 `0%` 或“暂无数据”，由页面视觉决定。

### 3.4 `loss_reason_stats`

作用：每次提交题型后生成一组错因快照。前端“上一次统计快照”指的是“上一次提交题型后”的快照。

建议主键：`loss_stat_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `loss_stat_id` | `text` | 快照行 ID |
| `type_submission_id` | `text` | 触发本次快照的提交 ID |
| `snapshot_seq` | `integer` | 学生维度下第几次题型提交快照 |
| `snapshot_at` | `timestamptz` | 快照生成时间 |
| `user_id` | `text` | 学生 ID |
| `math_type` | `text` | 数学类型 |
| `plan_variant_id` | `text` | 复习方案 |
| `plan_stage` | `text` | 阶段 |
| `trigger_type_id` | `text` | 本次提交的题型 ID |
| `wrong_reason_code` | `text` | 错因 code |
| `wrong_reason_name` | `text` | 错因展示名 |
| `wrong_count` | `integer` | 当前累计错题数 |
| `wrong_rate` | `numeric(5,2)` | 当前占比，数据库保存真实小数 |
| `previous_wrong_rate` | `numeric(5,2)` | 上一次提交题型后的占比 |
| `trend_delta` | `numeric(5,2)` | `wrong_rate - previous_wrong_rate` |
| `display_trend_delta` | `integer` | 前端展示用整数差值 |
| `created_at` | `timestamptz` | 创建时间 |

展示规则：

- 前端展示百分比时取整数。
- 某个旧错因这次没有出现但之前有，可以继续展示为当前占比 `0`、提高 `0`，保持前端结构稳定。
- `trend_delta` 存真实差值；`display_trend_delta` 存或返回整数，避免前端重复定义四舍五入口径。
- 本表不保存 `question_id`。错题列表和导出永远回查 `question_feedbacks`。

### 3.5 `student_daily_activity`

作用：按天缓存学习和刷题统计，服务成长页热力图、排行页、本周统计和个人页概览。

建议主键：`activity_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `activity_id` | `text` | 每日统计 ID |
| `user_id` | `text` | 学生 ID |
| `activity_date` | `date` | 日期 |
| `study_minutes` | `integer` | 当天自习室专注分钟数 |
| `activity_level` | `text` | 热力图等级 |
| `planned_question_count` | `integer` | 当天计划题目数 |
| `completed_question_count` | `integer` | 当天完成题目数 |
| `correct_question_count` | `integer` | 当天正确题数 |
| `wrong_question_count` | `integer` | 当天错题数 |
| `planned_type_count` | `integer` | 当天计划题型数 |
| `completed_type_count` | `integer` | 当天完成题型数 |
| `submitted_type_count` | `integer` | 当天已提交题型数 |
| `deferred_question_count` | `integer` | 当天选择延期的题数 |
| `carried_deferred_question_count` | `integer` | 当天由历史延期带入的题数，可选 |
| `updated_at` | `timestamptz` | 更新时间 |

`activity_level` 口径：

| 等级 | 页面文字 | 规则 |
| --- | --- | --- |
| `none` | 休息 | `study_minutes = 0` |
| `low` | 0-2h | `0 < study_minutes <= 120` |
| `medium` | 2-3h | `120 < study_minutes <= 180` |
| `high` | `>3h` | `study_minutes > 180` |

更新来源：

- 学生提交题型反馈后，刷新计划、完成、正确、错误、题型数。
- 自习室专注结束后，刷新 `study_minutes` 和 `activity_level`。

本周统计从本表聚合，不单独建周表：

| 前端展示 | 计算方式 |
| --- | --- |
| 本周完成率 | `sum(completed_question_count) / sum(planned_question_count)` |
| 本周正确率 | `sum(correct_question_count) / sum(completed_question_count)` |
| 本周完成题型 | `sum(completed_type_count)` |
| 本周刷题数 | `sum(completed_question_count)` |
| 连续学习天数 | 从最近日期向前数 `study_minutes > 0` 或 `completed_question_count > 0` 的连续天数 |

注意：

- 休息日 `planned_question_count=0`，不影响本周完成率分母。
- 延期题如果在同一周内多次带入计划，周完成率分母应按原始计划链去重，避免同一道题因为延期重复算多次计划量。
- 如果第一批实现去重成本较高，可以先保留 `carried_deferred_question_count` 做排查字段，并在服务层聚合时处理。

### 3.6 `student_chapter_completions`

作用：记录学生完成某个原始章节后的个人章节结果，并和公共 `chapter_summary_templates` 组合展示章节小结。

建议主键：`completion_id`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `completion_id` | `text` | 章节完成记录 ID |
| `user_id` | `text` | 学生 ID |
| `math_type` | `text` | 数学类型 |
| `plan_variant_id` | `text` | 复习方案 |
| `plan_stage` | `text` | 阶段 |
| `chapter_id` | `text` | 原始章节 ID |
| `display_chapter_id` | `text` | 展示章节 ID |
| `completed_type_count` | `integer` | 已完成题型数 |
| `total_type_count` | `integer` | 该原始章节可布置题型数 |
| `completed_question_count` | `integer` | 已完成题目数 |
| `correct_question_count` | `integer` | 正确题数 |
| `wrong_question_count` | `integer` | 错题数 |
| `chapter_mastery_rate` | `numeric(5,2)` | 本原始章节正确率 |
| `top_loss_reason_codes` | `text` | 主要错因 code，逗号分隔或 JSON |
| `completed_at` | `timestamptz` | 章节完成时间 |
| `trigger_type_submission_id` | `text` | 触发章节完成的题型提交 ID |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

触发规则：

- 当前原始章节下所有 `direct_assignable=1` 的题型都完成后，写入或更新本表。
- 章节总结不按复习方案复制，公共文案从 `chapter_summary_templates` 按 `math_type + chapter_id + plan_stage` 查询。
- 学生个人正确率、错因、错题数来自运行表，不需要在公共章节总结模板中预留个人字段。

## 4. API 和前端绑定口径

正式改前端时，建议以本节字段为准。旧 MVP 字段可以保留一段兼容，但新字段应优先返回。

### 4.1 注册开通页

现有接口：

```text
GET /public/registration-options?mathType=数学二
POST /students/{user_id}/onboarding
```

注册页读取：

| 前端字段 | 后端来源 |
| --- | --- |
| `mathType` | `plan_variants.math_type` |
| `planVariants[].planVariantId` | `plan_variants.plan_variant_id` |
| `planVariants[].reviewOrder` | `plan_variants.review_order` |
| `planVariants[].studentLabel` | `plan_variants.student_label` |
| `exerciseBooks[].bookId` | `exercise_books.book_id` |
| `exerciseBooks[].bookName` | `exercise_books.book_name` |
| `institutions[]` | `/institutions/search` |

注册页提交：

| 字段 | 保存位置 |
| --- | --- |
| `mathType` | `student_profiles.math_type` |
| `planVariantId` | `student_profiles.plan_variant_id` |
| `reviewOrder` | 可保留兼容，但每日计划优先用 `planVariantId` |
| `primaryBookIds` / `backupBookIds` | 学生个人资料表，保存 `exercise_books.book_id` |
| `targetSchoolId` | 学生个人资料表 |
| `level` | 学生个人资料表，并用于自动分班 |

### 4.2 今日计划页

现有接口：

```text
GET /students/{user_id}/daily-plan?date=YYYY-MM-DD
POST /feedback/submit
```

`GET /daily-plan` 建议返回：

| 前端字段 | 后端来源 |
| --- | --- |
| `plan.date` | `daily_plans.plan_date` |
| `plan.types[].typeId` | `daily_plans.type_id` |
| `plan.types[].chapterId` | `daily_plans.chapter_id` |
| `plan.types[].displayChapterId` | `daily_plans.display_chapter_id` |
| `plan.types[].cardTitle` | `question_types.card_title` |
| `plan.types[].intro` | `importance_tag + question_kind + intro_title + intro_body` |
| `plan.types[].questions[].questionId` | `questions.question_id` |
| `plan.types[].questions[].bookDisplayLabel` | `questions.book_display_label` |
| `plan.types[].questions[].sourceChapterLabel` | `questions.source_chapter_label` |
| `plan.types[].questions[].sourceSectionLabel` | `questions.source_section_label` |
| `plan.types[].questions[].sourceSubsectionLabel` | `questions.source_subsection_label` |
| `plan.types[].questions[].sourceQuestionLabel` | `questions.source_question_label` |
| `plan.currentFeedbackTypeId` | 第一个 `feedback_open_status=open` 的题型 |
| `plan.feedbackItems` | 当前可提交题型下的计划题 |
| `plan.chapterCompletion` | `student_chapter_completions` |
| `plan.chapterSummaryTemplate` | `chapter_summary_templates` |

题目来源展示：

- 前端优先用五个结构化字段展示。
- `source_chapter_label/source_section_label/source_subsection_label` 为空时跳过该层。
- `original_position_text` 只用于后台核查、导出和追溯，不作为学生端首选展示字段。

`POST /feedback/submit` 建议请求：

| 字段 | 说明 |
| --- | --- |
| `userId` | 学生 ID |
| `planDate` | 计划日期 |
| `typeId` | 本次提交的题型 |
| `answers[].planId` | 计划题 ID |
| `answers[].questionId` | 题目 ID |
| `answers[].result` | `correct` / `wrong` / `unattempted` |
| `answers[].unattemptedAction` | `mark_wrong` / `defer` / 空值 |
| `answers[].wrongReasonCode` | 错因 code |
| `answers[].wrongReasonName` | 错因展示名 |

提交成功后建议返回：

| 字段 | 用途 |
| --- | --- |
| `typeSubmissionId` | 本次题型提交 ID |
| `dailyActivity` | 刷新今日和本周统计 |
| `typeMastery` | 刷新章节掌握度 |
| `lossReasons` | 刷新错因图 |
| `chapterCompletion` | 如果触发章节完成则返回 |
| `chapterSummaryTemplate` | 如果触发章节完成则返回公共小结 |

### 4.3 成长页

现有接口：

```text
GET /students/{user_id}/curve
```

建议返回：

| 前端字段 | 后端来源 | 说明 |
| --- | --- | --- |
| `curve.activity` | `student_daily_activity` | 最近 14 天热力图 |
| `curve.activitySummary.currentStreakDays` | `student_daily_activity` 聚合 | 连续学习天数 |
| `curve.weekly.questionCount` | `student_daily_activity.completed_question_count` 聚合 | 本周刷题数 |
| `curve.weekly.completionRate` | `completed_question_count / planned_question_count` | 本周完成率 |
| `curve.weekly.accuracyRate` | `correct_question_count / completed_question_count` | 本周正确率 |
| `curve.weekly.completedTypeCount` | `completed_type_count` 聚合 | 本周完成题型 |
| `curve.mastery` | `type_mastery_stats + display_chapters` | 章节掌握度 |
| `curve.lossReasons` | `loss_reason_stats` | 错因比例和趋势 |

不再返回：

- `curve.priorities`
- `priority_recommendations`

如果前端旧代码仍存在这些字段，应先改为可选兼容，再移除 UI 绑定。

### 4.4 自习室页

现有接口：

```text
GET /students/{user_id}/study-room
POST /focus-sessions/start
POST /focus-sessions/{session_id}/finish
```

自习室完成专注后：

1. 写入或更新 `focus_sessions`。
2. 聚合当天专注分钟数。
3. 更新 `student_daily_activity.study_minutes`。
4. 按热力图规则更新 `student_daily_activity.activity_level`。
5. 前端重新拉取自习室和成长页相关数据。

### 4.5 章节小结

章节小结展示由两部分组成：

| 展示内容 | 来源 |
| --- | --- |
| 本章在真题中的考察 | `chapter_summary_templates.exam_focus` |
| 本章核心能力 | `chapter_summary_templates.key_points` |
| 常见失分点 | `chapter_summary_templates.common_mistakes` |
| 复盘建议 | `chapter_summary_templates.review_suggestions` |
| 本章正确率、错题数、主要错因 | `student_chapter_completions` + `question_feedbacks` |

公共模板不保存任何学生个人数据。学生的正确率、错因和错题导出全部从运行表读取。

## 5. 后端实现顺序建议

1. 先按本文档补齐 PostgreSQL 运行表迁移。
2. 改 `POST /feedback/submit`：禁止重复提交，引入 `type_submission_id`，区分 `mark_wrong` 和 `defer`。
3. 提交后即时刷新 `student_daily_activity`、`type_mastery_stats`、`loss_reason_stats`、`student_chapter_completions`。
4. 改 `GET /students/{user_id}/daily-plan`：返回题目五层来源字段和章节小结组合字段。
5. 改 `GET /students/{user_id}/curve`：按 `student_daily_activity` 聚合本周指标，按 `display_chapter_id` 返回掌握度。
6. 前端 v3.2 逐步改绑定字段，旧 MVP 字段只保留过渡兼容。

## 6. 验证清单

上线前至少验证：

- 同一题型提交一次后，第二次提交被拒绝。
- `wrong` 和 `unattempted + mark_wrong` 都进入错题导出。
- `unattempted + defer` 不进入正确率分母，且第二天继续布置。
- 每提交一个题型后，章节掌握度立即变化。
- 每提交一个题型后，错因快照生成一组新记录。
- 错因图前端展示整数百分比。
- 旧错因本次为 0 时，前端结构不乱。
- 章节完成后，今日计划接口返回个人章节数据和公共章节小结。
- 最近 14 天热力图按自习室专注分钟数分四档。
- 本周完成率、正确率、刷题数、完成题型数均从 `student_daily_activity` 聚合。
- 成长页不再依赖 `priority_recommendations`。
