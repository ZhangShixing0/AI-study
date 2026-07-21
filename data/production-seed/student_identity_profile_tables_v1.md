# student_identity_profile_tables_v1 学生账号与开通资料表口径

最后更新：2026-06-28

适用范围：学生端 v3.2 首次开通页、自动分班、我的页面、每日计划、自习室学习目标、排行榜连续完成天数。

本文档是运行时 PostgreSQL 表口径，不是公共 seed Excel。公共 Excel 维护题库、题型、章节、资料、院校、班级入口等配置；`users` 和 `student_profiles` 记录每个真实学生自己的账号与学习配置。

## 1. 第一批保留范围

第一批正式上线只确认两张核心表：

| 表 | 作用 |
| --- | --- |
| `users` | 账号、登录、角色、昵称、头像、单设备登录状态 |
| `student_profiles` | 学生开通后选择的数学类型、目标、资料、复习方案、分班、每日目标 |

第一批不新建：

| 表 | 原因 |
| --- | --- |
| `student_profile_versions` | 今天不做学生资料历史版本追踪 |
| `student_preferences` | 当前偏好字段很少，先放在 `student_profiles` |
| `student_study_goals` | 每日目标来自 `student_profiles.daily_target_minutes`，不需要每天一条目标表 |
| 复杂徽章表 | 勋章进度由连续完成反馈天数实时生成 |

## 2. `users`

作用：保存账号级信息。只要不是数学学习配置，都优先放这里。

建议字段：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `user_id` | `text` | 用户 ID，主键 |
| `login_account` | `text` | 登录账号，唯一 |
| `password_hash` | `text` | 密码哈希，不能保存明文密码 |
| `role` | `text` | `student` / `teacher` / `admin` |
| `nickname` | `text` | 昵称 |
| `avatar_url` | `text` | 头像地址 |
| `gender` | `text` | 学生注册时填写的性别，可用于默认头像 |
| `qq` | `text` | 学生 QQ 或联系 QQ |
| `account_status` | `text` | `active` / `inactive` / `expired_pending_review` / `disabled` |
| `current_session_id` | `text` | 当前有效登录 session，用于单设备在线 |
| `last_login_at` | `timestamptz` | 最近登录时间 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

关键约束：

- `login_account` 必须唯一。
- `role=student` 的用户应有一条对应的 `student_profiles`。
- `password_hash` 只保存后端哈希结果。
- 单设备在线由 `users.current_session_id + user_sessions.session_id` 判断。

## 3. `student_profiles`

作用：保存学生注册开通后形成的长期学习配置。

建议字段：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `user_id` | `text` | 学生用户 ID，主键并关联 `users.user_id` |
| `math_type` | `text` | 数学类型：`数学一` / `数学二` / `数学三` |
| `target_exam_year` | `integer` | 考研年份 |
| `target_exam_date` | `date` | 考试日期，用于倒计时 |
| `target_score` | `integer` | 目标分数 |
| `target_school_id` | `text` | 目标院校 ID，关联 `institutions.school_id` |
| `foundation_level` | `text` | 注册页自选基础：`基础薄弱` / `基础一般` / `基础较好` / `强化冲刺` |
| `level` | `text` | 系统诊断后分层：`A` / `B` / `C` / `D` |
| `class_id` | `text` | 自动分配到的班级 ID |
| `plan_enabled` | `boolean` | 是否启用正式学习计划 |
| `paid_until` | `date` | 服务有效期 |
| `plan_variant_id` | `text` | 复习方案 ID，例如 `math2_mixed` |
| `review_order` | `text` | 注册页提交值：`mixed` / `gaoshu_first` |
| `primary_book_1` | `text` | 主选习题册 1，保存 `exercise_books.book_id` |
| `primary_book_1_scope` | `text` | 主选习题册 1 范围：`basic` / `advanced` / `both` / `all` |
| `primary_book_2` | `text` | 主选习题册 2，保存 `exercise_books.book_id` |
| `primary_book_2_scope` | `text` | 主选习题册 2 范围：`basic` / `advanced` / `both` / `all` |
| `backup_book` | `text` | 备选习题册，保存 `exercise_books.book_id` |
| `daily_target_minutes` | `integer` | 每日数学学习目标分钟数 |
| `intensive_days` | `integer` | 预计强化阶段天数 |
| `diagnostic_json` | `jsonb` | 注册诊断题答案、诊断版本、分层依据 |
| `current_stage` | `text` | 当前阶段，第一批默认 `强化` |
| `current_type_id` | `text` | 当前推进到的题型，可保留兼容；长期可由 `student_progress` 管 |
| `last_plan_date` | `date` | 最近一次生成计划日期，可保留兼容 |
| `onboarding_completed_at` | `timestamptz` | 首次开通完成时间 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

不建议作为正式主字段：

| 字段 | 处理建议 |
| --- | --- |
| `target_school_name` | 只做兼容或缓存；正式展示应通过 `target_school_id` join `institutions` |
| `daily_study_hours` | 前端可以提交小时，后端统一转成 `daily_target_minutes` |
| `primary_books` JSON | 第一批直接拆成 `primary_book_1`、`primary_book_2` 和 scope 字段，便于 SQL 查询 |

## 4. 注册页字段映射

学生端首次开通页提交字段和数据库字段的关系：

| 前端字段 | 后端保存 |
| --- | --- |
| `nickname` | `users.nickname` |
| `gender` | `users.gender` |
| `qq` | `users.qq` |
| `newPassword` | 哈希后写入 `users.password_hash` |
| `mathType` | `student_profiles.math_type` |
| `targetScore` | `student_profiles.target_score` |
| `foundationLevel` | `student_profiles.foundation_level` |
| `primaryBooks[0].bookId` | `student_profiles.primary_book_1` |
| `primaryBooks[0].scope` | `student_profiles.primary_book_1_scope` |
| `primaryBooks[1].bookId` | `student_profiles.primary_book_2` |
| `primaryBooks[1].scope` | `student_profiles.primary_book_2_scope` |
| `backupBookId` | `student_profiles.backup_book` |
| `dailyStudyHours` | 后端乘以 60 后写入 `student_profiles.daily_target_minutes` |
| `intensiveDays` | `student_profiles.intensive_days` |
| `reviewOrder` | `student_profiles.review_order`，并解析成 `plan_variant_id` |
| `diagnosticAnswers` | `student_profiles.diagnostic_json`，同时生成 `level` |

第一批校验规则：

- `mathType` 只能是 `数学一` / `数学二` / `数学三`。
- `targetScore` 范围为 `1-150`。
- `dailyStudyHours` 范围为 `0.5-12`，保存时转为分钟整数。
- `intensiveDays` 范围为 `40-100`。
- `reviewOrder` 只能是 `mixed` / `gaoshu_first`。
- 两本主选习题册不能重复。
- 主选和备选习题册必须存在于 `exercise_books`，并且匹配当前 `math_type`。

## 5. 自动分班依赖

注册完成后自动分班依赖这些字段：

| 来源字段 | 用途 |
| --- | --- |
| `student_profiles.math_type` | 只进入对应数学类型班级 |
| `student_profiles.level` | 进入 A/B/C/D 对应层级班级 |
| `classes.capacity` / 当前有效学生数 | 判断班级是否还能接收新生 |
| `class_intake_settings.active_class_id` | 指定当前新生进入哪个班 |

写入结果：

```text
student_profiles.class_id
student_profiles.level
student_profiles.plan_enabled = true
student_profiles.paid_until
```

如果 A/B/C/D 对应班级已满，后台管理员应先创建新班级，再把 `class_intake_settings.active_class_id` 指向新班。`classes.class_status=full` 只表示不再接收新生，不影响该班已有学生继续使用自习室和排行榜。

## 6. 我的页面读取口径

学生端“我的页面”建议从以下字段组装：

| 页面内容 | 数据来源 |
| --- | --- |
| 头像 | `users.avatar_url` |
| 昵称 | `users.nickname` |
| 用户 ID | `users.user_id` |
| 数学类型 | `student_profiles.math_type` |
| 目标分 | `student_profiles.target_score` |
| 考试年份 | `student_profiles.target_exam_year` |
| 考试日期 | `student_profiles.target_exam_date` |
| 倒计时 | 后端按 `target_exam_date - today` 计算 |
| 主选习题册 | `primary_book_1`、`primary_book_2` join `exercise_books` |
| 备选习题册 | `backup_book` join `exercise_books` |
| 目标院校 | `target_school_id` join `institutions` |
| 每日数学学习目标 | `daily_target_minutes / 60` |
| QQ 群 | `class_id` join `classes.qq_group` |
| 班级名称 | `class_id` join `classes.class_name` |
| 今日提交状态 | `student_daily_activity.daily_feedback_status` |
| 今日刷题数 | `student_daily_activity.planned_question_count` 或 `daily_plans` 聚合 |
| 今日学习时长 | `student_daily_activity.study_minutes / 60` |
| 连续完成反馈天数 | 从 `student_daily_activity.is_daily_feedback_completed` 往前聚合 |
| 勋章进度 | 根据连续完成反馈天数实时生成 |

`blocked_by_unfinished` 在我的页面显示为“已完成”。它表示学生今天已经完整提交了所有应提交题型反馈，只是其中有题目延期到明天继续。

## 7. 自习室学习目标读取口径

自习室顶部“今日数学学习目标”不使用固定 3 小时。

| 页面内容 | 数据来源 |
| --- | --- |
| 目标分钟数 | `student_profiles.daily_target_minutes` |
| 今日已专注分钟数 | `student_daily_activity.study_minutes` |
| 进度条比例 | `study_minutes / daily_target_minutes` |

每次专注结束后：

1. 写入或更新 `focus_sessions`。
2. 重算 `student_daily_activity.study_minutes`。
3. 自习室 API 返回新的 `completedMinutes` 和 `completionRate`。
4. 前端重新渲染目标进度条。

## 8. 和每日计划的关系

每日计划推进优先使用：

```text
student_profiles.plan_variant_id
-> question_type_orders.plan_variant_id
-> question_type_orders.sort_code
```

`review_order` 只保留为注册页提交值和兼容字段，不作为每日计划主索引。

学生选择的资料影响 `questions` 过滤：

```text
primary_book_1 / primary_book_2 / backup_book
-> exercise_books.book_id
-> questions.book_id
```

`primary_book_1_scope` 和 `primary_book_2_scope` 用于区分类似 880、1000 的基础篇/强化篇范围；如果某本资料没有范围概念，则保存 `all`。

## 9. 兼容字段和正式字段

今天上线允许保留一些 MVP 兼容字段，但正式口径要明确：

| 当前兼容字段 | 正式口径 |
| --- | --- |
| `target_school_name` | 展示时优先 join `institutions`，该字段只做缓存或兼容 |
| `current_type_id` | 长期建议由 `student_progress` 负责推进；`student_profiles` 可暂时保留 |
| `last_plan_date` | 长期建议由 `daily_plans` 或 `student_progress` 负责；`student_profiles` 可暂时保留 |
| `dailyStudyHours` | 只作为前端提交字段，入库统一为 `daily_target_minutes` |
| `review_order` | 只作为提交值和兼容字段，计划推进优先用 `plan_variant_id` |

## 10. PostgreSQL 约束建议

上线建表时建议至少有这些约束：

```sql
alter table student_profiles
  add constraint student_profiles_math_type_check
  check (math_type in ('数学一', '数学二', '数学三'));

alter table student_profiles
  add constraint student_profiles_level_check
  check (level in ('A', 'B', 'C', 'D'));

alter table student_profiles
  add constraint student_profiles_review_order_check
  check (review_order in ('mixed', 'gaoshu_first'));

alter table student_profiles
  add constraint student_profiles_daily_target_minutes_check
  check (daily_target_minutes between 30 and 720);
```

外键建议：

| 字段 | 关联 |
| --- | --- |
| `student_profiles.user_id` | `users.user_id` |
| `student_profiles.target_school_id` | `institutions.school_id` |
| `student_profiles.class_id` | `classes.class_id` |
| `student_profiles.plan_variant_id` | `plan_variants.plan_variant_id` |
| `student_profiles.primary_book_1` | `exercise_books.book_id` |
| `student_profiles.primary_book_2` | `exercise_books.book_id` |
| `student_profiles.backup_book` | `exercise_books.book_id` |

## 11. 今天上线检查

上线前按这个顺序检查：

1. 新学生完成首次开通后，`users` 有昵称、头像、QQ、密码哈希、账号状态。
2. `student_profiles` 有 `math_type`、`target_score`、`level`、`class_id`、`plan_variant_id`、习题册、每日目标。
3. `class_id` 对应的 `classes.qq_group` 能在我的页面展示。
4. `plan_variant_id` 能找到 `question_type_orders`，今日计划能生成题型。
5. 学生进入自习室时，目标时长来自 `daily_target_minutes`。
6. 提交题型反馈后，`student_daily_activity.daily_feedback_status` 和 `is_daily_feedback_completed` 能更新。
7. 我的页面的今日状态、连续完成天数、勋章进度能从正式字段或聚合结果返回。
8. 目标院校展示优先通过 `target_school_id` 查询 `institutions`。
