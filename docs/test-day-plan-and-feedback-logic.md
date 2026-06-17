# 内测日期推进、每日计划与反馈逻辑备忘

本文记录 2026-06-15 前后新增和确认的核心业务逻辑，方便后续继续迭代时快速回忆。

## 1. 当前版本定位

当前学生手机端原型主版本是：

```text
prototypes/student-mobile-v1.2
```

后端入口 `backend/main.py` 当前也指向 v1.2：

```python
PROTOTYPE_DIR = ROOT_DIR / "prototypes" / "student-mobile-v1.2"
```

这版主要解决三件事：

- 手机端底部导航和页面适配。
- 今日计划反馈支持错因选择和未作题目处理。
- 内测时可以让单个测试用户“进入下一天”，并刷新全部页面数据。

## 2. 每日计划生成原则

每日计划生成不是按日期复制，也不是日期驱动。

真正的生成核心是：

```text
学生当前题型指针 -> 当前题型状态 -> 题型顺序 -> 可用题目 -> 当天计划
```

关键数据来自 `student_progress`：

| 字段 | 作用 |
| --- | --- |
| `current_type_id` | 当前要从哪个题型开始布置 |
| `current_type_status` | 当前题型状态，常用值是 `active` / `unfinished` |
| `unfinished_type_id` | 如果某题型没做完，记录该题型 |
| `unfinished_question_ids` | 如果某题型没做完，记录第二天要继续布置的未作题目 |
| `last_completed_type_id` | 最近完成/跳过的题型 |
| `last_generated_plan_date` | 最近生成过计划的日期 |

生成过程：

1. 读取学生档案、进度和班型。
2. 从 `current_type_id` 或 `unfinished_type_id` 开始。
3. 按 `question_types.sort_code` 的顺序往后找题型。
4. 每个题型内根据班型、阶段、习题册过滤题目。
5. 累加题型建议天数，让任务量接近一天。
6. 第一题型开放提交，后续题型默认锁定。

因此同一个班型的题型顺序是固定的，不同学生只是指针位置不同。

## 3. 内测“开启下一日计划”逻辑

为了测试多天连续使用，现在新增了测试专用日期表：

```text
test_user_dates
```

字段：

| 字段 | 作用 |
| --- | --- |
| `user_id` | 测试用户 |
| `current_test_date` | 该测试用户当前模拟日期 |
| `created_at` / `updated_at` | 创建和更新时间 |

新增接口：

```http
POST /students/{user_id}/test-day/advance
```

点击“开启下一日计划”时，不再由前端本地把日期加一天，而是调用这个接口。

接口流程：

1. 读取该用户自己的 `current_test_date`。
2. 只把这个用户推进到下一天。
3. 其他测试用户日期不变。
4. 用新日期作为 `plan_date`。
5. 调用原有每日计划生成逻辑，根据题型指针生成新一天计划。
6. 补齐成长、排行、自习室、我的页面需要的当天基础数据。
7. 返回 `currentTestDate` 和新一天 `dailyPlan`。

返回示例结构：

```json
{
  "currentTestDate": "2026-06-11",
  "dailyPlan": {
    "student": {},
    "plan": {}
  }
}
```

前端收到后会用新日期重新请求：

```text
/students/{user_id}/daily-plan
/students/{user_id}/rankings
/students/{user_id}/curve
/students/{user_id}/study-room
/students/{user_id}/profile
```

## 4. 为什么补齐辅助数据

真实进入下一天时，不只是今日计划页面要变，其他页面也要跟着新日期读取数据。

因此推进测试日期后，会补齐这些表的最小可用数据：

| 表 | 作用 |
| --- | --- |
| `student_stats` | 排行、我的页面、成长页核心指标 |
| `student_daily_activity` | 最近 14 天热力图 |
| `student_study_goals` | 自习室和我的页面学习目标 |
| `type_mastery_stats` | 章节掌握度 |
| `loss_reason_stats` | 错因趋势 |
| `priority_recommendations` | 最该优先补强 |

补齐方式：

- 如果目标日期已有数据，不覆盖。
- 如果没有，则优先复制该用户最近一天的数据并改日期。
- 对当天完成率、打卡顺序、今日学习等“当天状态”字段做轻量重置。
- 如果连历史数据也没有，就创建一个最小可用默认记录。

这只是内测辅助逻辑，目的是让多天测试时五个页面都能正常打开。

## 5. 未作题目处理逻辑

今日计划提交时，题目结果有三种：

```text
correct
wrong
unattempted
```

如果出现 `unattempted`，必须选择如何处理，不能直接提交。

前端弹出底部确认层：

```text
本题型还有 X 道未作，怎么处理？

跳过：记录为未攻克，并开放下一题型。
没做完：后续题型不再开放提交，明天从本题型继续布置。
```

两个操作：

| 按钮 | 后端值 | 含义 |
| --- | --- | --- |
| 跳过未作，继续下一题型 | `skip` | 未作题记为未攻克，但本题型视为提交完成，指针继续往后 |
| 没做完，明天从本题型继续 | `defer` | 当前题型未完成，后续题型不开放提交，第二天继续布置未作题 |

### 5.1 skip 分支

适合场景：

```text
这几题确实不会，学生决定跳过，继续后面的题型。
```

后端行为：

- 未作题写入 `question_feedbacks`。
- `result = unattempted`。
- `is_wrong_record = 1`。
- `is_unfinished_blocker = 0`。
- `unattempted_action = skip`。
- 当前题型标记为 submitted。
- 若还有后续题型，开放下一题型。
- `student_progress.current_type_status = active`。
- `unfinished_type_id = ''`。
- `unfinished_question_ids = []`。
- 题型指针推进到下一题型。

### 5.2 defer 分支

适合场景：

```text
今天没做完，不代表这些题都不会，后续题型也不应继续开放。
```

后端行为：

- 已做题的正确/错误记录正常保存。
- 未作题写入 `question_feedbacks`。
- `result = unattempted`。
- `is_wrong_record = 1`。
- `is_unfinished_blocker = 1`。
- `unattempted_action = defer`。
- 当天计划状态变为 `blocked_by_unfinished`。
- 后续题型不再开放提交。
- `student_progress.current_type_status = unfinished`。
- `unfinished_type_id = 当前题型`。
- `unfinished_question_ids = 未作题目 ID 列表`。

第二天生成计划时：

1. 发现 `current_type_status = unfinished`。
2. 从 `unfinished_type_id` 开始。
3. 本题型只布置 `unfinished_question_ids` 中的题目。
4. 这个题型做过的题不再重复布置。
5. 该题型完成后，再恢复正常题型顺序。

## 6. 错因选择逻辑

点击“错误”后，必须选择错因才能提交。

前端展示为一行短按钮：

```text
方法错 / 计算错 / 知识点 / 条件漏
```

后端保存值：

| 前端文字 | 后端 code | 后端名称 |
| --- | --- | --- |
| 方法错 | `method_error` | 方法选择错误 |
| 计算错 | `calculation_error` | 计算失误 |
| 知识点 | `knowledge_gap` | 知识点不熟/概念混淆 |
| 条件漏 | `condition_missed` | 条件或边界漏考虑 |

提交校验：

- `wrong` 必须带 `wrongReason`。
- `correct` 和 `unattempted` 不能带 `wrongReason`。
- 错因必须是上面四个 code 之一。

相关数据表字段：

```text
question_feedbacks.wrong_reason_code
question_feedbacks.wrong_reason_name
```

## 7. 涉及的主要后端文件

| 文件 | 本次相关职责 |
| --- | --- |
| `backend/main.py` | 新增测试日期推进接口；当前静态页面指向 v1.2 |
| `backend/services.py` | 计划生成、测试日期推进、辅助数据补齐、错因/未作提交逻辑 |
| `backend/seed_db.py` | 初始化 `test_access_codes`、`test_user_dates` 和新增字段 |
| `backend/test_flow.py` | 覆盖测试码登录、新用户建档、错因、未作、下一日推进 |

## 8. 涉及的主要前端文件

| 文件 | 本次相关职责 |
| --- | --- |
| `prototypes/student-mobile-v1.2/assets/js/app.js` | 登录后读取 `currentTestDate`；点击下一日调用后端接口并刷新五页数据 |
| `prototypes/student-mobile-v1.2/assets/js/pages/plan.js` | 今日计划反馈区、错因按钮、未作确认弹层 |
| `prototypes/student-mobile-v1.2/styles/app.css` | v1.2 手机端样式、底部导航、弹层和页面适配 |

## 9. 当前验证命令

后端语法检查：

```powershell
.\.venv\Scripts\python.exe -m py_compile backend\main.py backend\services.py backend\seed_db.py backend\test_flow.py
```

后端业务闭环测试：

```powershell
.\.venv\Scripts\python.exe -m backend.test_flow
```

前端语法检查：

```powershell
node --check prototypes\student-mobile-v1.2\assets\js\app.js
node --check prototypes\student-mobile-v1.2\assets\js\pages\plan.js
```

本次已验证：

- 测试用户登录返回 `currentTestDate`。
- 单个用户推进到下一天后，其他用户不受影响。
- 下一日计划按 `student_progress` 题型指针生成。
- 新日期的今日计划、排行、成长、自习室、我的页面接口都能返回 200。
- 错因必填校验正常。
- 未作题目 `skip` 和 `defer` 分支正常。

## 10. 后续正式上线要注意

当前“开启下一日计划”是内测便利功能，正式上线时应删除或隐藏。

正式上线更接近的方案：

```text
真实日期推进
  -> 用户当天提交反馈
  -> 晚上或首次访问时按题型指针生成第二天计划
  -> 五个页面读取真实日期数据
```

内测阶段的 `test_user_dates` 可以保留在测试环境，但正式生产环境不应让普通用户手动推进日期。

后续如果用户量增长，可以再把“辅助数据补齐”从接口内同步执行，改成夜间批处理或后台任务。
