# student_engagement_runtime_tables_v1 自习室、排行与我的页面口径

最后更新：2026-06-28

适用范围：学生端 v3.2 的自习室、同行陪伴、我的页面今日状态、排行榜和勋章进度。

本文档是运行时数据口径，不是新的公共题库 Excel。正式运行时使用 PostgreSQL；Excel 只继续维护公共题库、章节、题型、题目、院校、班级入口等 seed 数据。

## 1. 第一批边界

第一批保留：

| 表/数据 | 作用 |
| --- | --- |
| `study_rooms` | 每个班一个自习室，保存房间配置 |
| `focus_sessions` | 每一轮专注的原始事实表 |
| `student_daily_activity` | 每个学生每天的专注、题目反馈和热力图缓存 |
| `student_profiles.daily_target_minutes` | 学生自己的每日数学学习目标 |

第一批不建：

| 表/数据 | 原因 |
| --- | --- |
| `study_room_members` | v3.2 同行陪伴只展示 4 个正在专注同学，可直接查 `focus_sessions` |
| `student_study_goals` | 每日目标来自学生资料，今日已学来自 `student_daily_activity`，不需要每天一张目标表 |
| `student_stats` 作为事实表 | 排行榜第一批可从 `student_daily_activity` 聚合 |
| 复杂徽章系统表 | 第一批只展示勋章进度，由连续天数实时生成，不记录发放流水 |

## 2. 自习室房间 `study_rooms`

口径：每个班一个自习室。自习室是班级的长期空间，不跟随班级招生状态自动关闭。

建议字段：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `room_id` | `text` | 自习室 ID，例如 `m2_2027_A_room` |
| `class_id` | `text` | 对应班级 |
| `room_name` | `text` | 前端展示名称 |
| `room_status` | `text` | `active` / `closed` / `archived` |
| `quiet_mode_enabled` | `boolean` | 是否安静模式 |
| `room_rule` | `text` | 房间规则文案 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

不要放：

- `online_count`：当前页面展示的是“全班 N 人”，应从当前班有效学生人数聚合。
- `math_type`、`target_exam_year`：可从 `classes` 关联得到。
- `sort_order`：每个班只有一个自习室，第一批不需要排序。

状态关系：

| 状态 | 影响范围 |
| --- | --- |
| `classes.class_status` | 是否接收新生、后台班级管理 |
| `study_rooms.room_status` | 自习室是否可进入 |

班级 `full` 时，自习室仍然可以是 `active`。

## 3. 专注记录 `focus_sessions`

作用：记录每一轮专注，是今日已学时长、热力图、今日榜、同行陪伴的事实来源。

建议字段：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `session_id` | `text` | 专注记录 ID |
| `user_id` | `text` | 学生 ID |
| `class_id` | `text` | 当时所在班级 |
| `room_id` | `text` | 当时所在自习室 |
| `plan_date` | `date` | 归属计划日期 |
| `task_type_id` | `text` | 选择的今日计划题型 ID |
| `task_name` | `text` | 选择任务的展示名快照 |
| `target_minutes` | `integer` | 本轮目标分钟数 |
| `started_at` | `timestamptz` | 开始时间 |
| `paused_at` | `timestamptz` | 最近暂停时间 |
| `resumed_at` | `timestamptz` | 最近继续时间 |
| `ended_at` | `timestamptz` | 结束时间 |
| `focused_seconds` | `integer` | 前端结算后的有效专注秒数 |
| `counted_minutes` | `integer` | 计入学习统计的分钟数 |
| `deducted_seconds` | `integer` | 因离开确认被扣除的秒数，第一批可先为 0 |
| `status` | `text` | `running` / `paused` / `completed` / `cancelled` / `expired` |
| `finish_reason` | `text` | `natural` / `early_exit` / `away_complete` / `expired` |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

结算口径：

- 倒计时自然完成：`finish_reason=natural`。
- 点击“退出专注”：`finish_reason=early_exit`，已专注时间仍计入。
- 离开页面超过 60 秒再回来：前端弹出“是否计入本轮专注？”。
- 选择“计入本轮”：离开时间计入。
- 选择“扣除离开时间”：离开时间从前端计时中扣除；后续可把扣除秒数写入 `deducted_seconds`。

第一批后端可以继续接收前端传来的 `focusedSeconds`，并按它计算 `counted_minutes`。正式库保留 `deducted_seconds` 是为了后续审计和防刷时长。

## 4. 同行陪伴

v3.2 前端实际只展示：

- 头像
- “名字第一个字 + 同学”
- 固定文案“正在专注”

因此正式 API 不需要返回今日专注时长、任务名或复杂在线状态。

接口返回：

```text
studyRoom.members[]
  name
  avatarUrl
```

后端查询：

```text
当前学生 class_id
-> 查询同班 focus_sessions
-> status = running
-> ended_at is null
-> started_at + target_minutes + 10 分钟宽限 >= now
-> 排除当前学生本人
-> 最多 4 个
-> 返回 users.nickname 和 users.avatar_url
```

不足 4 个时，前端继续使用假数据补齐。前端文案固定为“正在专注”。

刷新频率：

- 进入自习室页请求一次。
- 每个整点请求一次。
- 开始或结束本人的专注后，可顺手刷新一次。
- 不做实时心跳，不做秒级刷新。

## 5. 每日活动 `student_daily_activity`

作用：每个学生每天最多一行，缓存自习时长、热力图等级、做题反馈统计、今日反馈是否闭环。

建议字段：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `activity_id` | `text` | 每日活动 ID |
| `user_id` | `text` | 学生 ID |
| `activity_date` | `date` | 日期 |
| `study_minutes` | `integer` | 当天计入的专注分钟数 |
| `activity_level` | `text` | `none` / `low` / `medium` / `high` |
| `planned_question_count` | `integer` | 当天计划题目数 |
| `completed_question_count` | `integer` | 当天完成反馈的题目数 |
| `correct_question_count` | `integer` | 当天正确题数 |
| `wrong_question_count` | `integer` | 当天错题数 |
| `planned_type_count` | `integer` | 当天计划题型数 |
| `submitted_type_count` | `integer` | 当天已提交反馈题型数 |
| `daily_feedback_status` | `text` | `not_started` / `in_progress` / `completed` / `blocked_by_unfinished` |
| `is_daily_feedback_completed` | `boolean` | 是否算作“今日反馈已闭环” |
| `daily_feedback_completed_at` | `timestamptz` | 首次完成今日反馈闭环的时间 |
| `updated_at` | `timestamptz` | 更新时间 |

热力图口径：

| `study_minutes` | `activity_level` |
| ---: | --- |
| `0` | `none` |
| `1-120` | `low` |
| `121-180` | `medium` |
| `>180` | `high` |

今日反馈闭环口径：

| `daily_feedback_status` | `is_daily_feedback_completed` | 说明 |
| --- | --- | --- |
| `completed` | `true` | 今日应提交反馈已完成 |
| `blocked_by_unfinished` | `true` | 今日反馈已提交闭环，但有题延期到明天 |
| `in_progress` | `false` | 今日反馈提交了一部分 |
| `not_started` | `false` | 今日还没有提交反馈 |

`blocked_by_unfinished` 算连续榜完成，因为连续榜关注“是否完整提交今日所有应提交反馈”，不关注是否有延期题。

## 6. 学习目标与进度条

不建 `student_study_goals`。

| 页面内容 | 来源 |
| --- | --- |
| 今日数学学习目标 | `student_profiles.daily_target_minutes` |
| 今日已学 | `student_daily_activity.study_minutes` |
| 进度条比例 | 后端计算或前端计算 `study_minutes / daily_target_minutes` |

自习室和我的页面 API 应返回：

```text
targetMinutes
completedMinutes
completionRate
```

每次专注结束后：

1. 写入 `focus_sessions`。
2. 累加或重算 `student_daily_activity.study_minutes`。
3. 更新 `activity_level`。
4. 返回新的自习室数据，前端重渲染进度条。

## 7. 我的页面今日状态

v3.2 “我的页面”今日状态有 3 张卡：

| 卡片 | 正式口径 |
| --- | --- |
| 提交状态 | `pending` / `in-progress` / `completed` |
| 今日刷题 | 当天计划题目数，来自 `daily_plans` 或 `student_daily_activity.planned_question_count` |
| 已学 | `student_daily_activity.study_minutes` 换算小时 |

提交状态展示：

| 状态 | 前端文案 | 判断 |
| --- | --- | --- |
| `pending` | 待反馈 | 没有提交任何今日反馈 |
| `in-progress` | 进行中 | 已提交部分题型反馈 |
| `completed` | 已完成 | `daily_feedback_status=completed` 或 `blocked_by_unfinished` |

注意：`blocked_by_unfinished` 在我的页面算“已完成”，因为学生已经完成今天应提交的反馈流程，只是有延期题明天继续布置。

## 8. 排行榜

v3.2 第一批只保留两个榜：

| 榜单 | 排名依据 | 展示人数 |
| --- | --- | --- |
| 今日榜 | 班内今日专注时长从高到低 | 前 3 名 |
| 连续榜 | 班内连续完成今日反馈天数从高到低 | 前 3 名 |

范围：只在当前学生所在班级内排名。

今日榜：

```text
rank.today.top[]
  rank
  userId
  name
  avatarUrl
  studyMinutes
  metric = 专注 Xh
```

连续榜：

```text
rank.streak.top[]
  rank
  userId
  name
  avatarUrl
  continuousDays
  metric = 打卡 X天
```

连续天数计算：

```text
从今天往前查 student_daily_activity
只要 is_daily_feedback_completed = true，就连续 +1
遇到 false 或没有记录，就中断
```

如果后续增加正式休息日，再增加 `is_rest_day` 并约定“休息日不中断”；第一批先不引入休息日跳过逻辑。

## 9. 勋章进度

第一批保留“勋章进度”展示，但不建复杂徽章系统表。

勋章进度直接由连续完成今日反馈天数生成：

```text
badge targets = [7, 14, 21, 30]
```

API 返回建议：

```text
profile.badgeProgress
  continuousDays
  nextTargetDays
  nextBadgeName
  progressValue
  progressRate
  stages[]
    targetDays
    badgeName
    status
```

`stages[].status`：

| 值 | 含义 |
| --- | --- |
| `earned` | 已获得 |
| `current` | 当前冲刺 |
| `locked` | 未解锁 |

第一批不记录发放流水，不做 `badges`、`student_badges`、`badge_events`。后续如果要做可领取徽章、弹窗、历史徽章墙，再单独扩展。

## 10. API 返回口径

### 10.1 `GET /students/{user_id}/study-room`

建议返回：

```text
studyRoom.roomId
studyRoom.roomName
studyRoom.classMemberCount
studyRoom.quietMode
studyRoom.rule
studyRoom.targetMinutes
studyRoom.completedMinutes
studyRoom.completionRate
studyRoom.focusMinutes
studyRoom.currentTaskName
studyRoom.taskOptions[]
studyRoom.members[]
```

其中：

- `classMemberCount` 来自当前班有效学生数。
- `members` 只返回正在专注的同班同学，最多 4 个。
- `focusMinutes` 是本轮默认展示值，可由前端选择覆盖；第一批不长期保存学生上次选择。

### 10.2 `POST /focus-sessions/start`

写入 `focus_sessions`，`status=running`。

当前任务必须来自今日计划题型。第一批不支持自由任务。

### 10.3 `POST /focus-sessions/{session_id}/finish`

更新 `focus_sessions`，并刷新：

- `student_daily_activity.study_minutes`
- `student_daily_activity.activity_level`

返回新的：

- `studyRoom`
- `profile`
- `curve`
- `rank`

### 10.4 `GET /students/{user_id}/rankings`

只需要返回今日榜和连续榜：

```text
rank.boards.today
rank.boards.streak
rank.summary.todayRank
rank.summary.continuousRank
rank.summary.continuousDays
```

第一批不返回本周榜。

### 10.5 `GET /students/{user_id}/profile`

建议返回：

```text
profile.todaySubmissionStatus
profile.todayQuestionCount
profile.todayStudyHours
profile.dailyMathGoalHours
profile.badgeProgress
```

前端可以继续从 `plan` 和 `rank` 回退推导，但正式 API 应逐步直接给出这些字段，减少页面重复计算。

## 11. 验证清单

上线前至少验证：

- 班级 `full` 时，自习室仍可进入。
- 自习室顶部“全班 N 人”来自当前班有效学生数，不是在线人数。
- 同行陪伴只展示同班正在专注学生，最多 4 个，排除本人。
- 同行陪伴不足 4 个时，前端假数据补齐。
- 同行陪伴前端每小时整刷新一次，不做秒级刷新。
- 点击退出专注后，已专注时间计入今日已学。
- 离开页面超过 60 秒后，学生选择扣除时不计入离开时间。
- 专注结束后，自习室目标进度条更新。
- 今日榜按今日专注时长排序，只展示前三名。
- 连续榜按连续完成今日反馈天数排序，只展示前三名。
- `blocked_by_unfinished` 在我的页面显示为“已完成”，并计入连续榜。
- 勋章进度由连续天数生成，不依赖徽章表。
