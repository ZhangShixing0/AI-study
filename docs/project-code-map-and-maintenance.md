# 考研督学网站代码地图与维护指南

本文档用于帮助不熟悉代码的人快速判断：某个页面、某个数据、某个接口、某个样式应该去哪里改。

每隔一段时间项目有明显变化时，都应该更新本文档。更新方法见文末的“如何维护这份文档”。

## 1. 当前技术路线

当前项目是一个“可运行的手机端网页 MVP”，技术路线是：

| 层级 | 当前技术 | 作用 |
| --- | --- | --- |
| 前端页面 | 原生 HTML + CSS + JavaScript | 制作手机端五个页面、登录、页面切换、提交反馈、自习室专注交互 |
| 后端接口 | FastAPI | 提供登录、今日计划、排行、曲线、自习室、我的页面、院校搜索、反馈提交等 API |
| 数据库 | SQLite | 本地真实数据库，文件是 `backend/app.db` |
| 数据来源 | Excel 表格 | `data/samples/*.xlsx` 是目前维护数据的主要入口 |
| 数据导入 | Python 脚本 | `backend/seed_db.py` 把 Excel 表格导入 SQLite |
| 前端兜底数据 | `data/app-data.js` | 后端没启动或本地验证时用的静态数据蓝本 |
| 验证方式 | Node + Python 测试脚本 | 检查前端渲染和后端业务闭环是否正常 |

当前不是 React/Vue 项目，也没有前端打包工具。优点是启动简单、修改直接；缺点是后续复杂度继续上升后，需要考虑升级为更标准的前端工程。

## 2. 整体运行逻辑

用户打开网页后，大致流程如下：

1. 浏览器访问 `http://127.0.0.1:8000/`。
2. FastAPI 返回前端入口文件 `prototypes/student-mobile-v0.1/index.html`。
3. 页面加载 CSS、图片、JS 文件。
4. 用户输入账号密码。
5. 前端调用 `/auth/login` 登录接口。
6. 登录成功后，前端同时请求这个学生的五类数据：
   - `/students/{user_id}/daily-plan`
   - `/students/{user_id}/rankings`
   - `/students/{user_id}/curve`
   - `/students/{user_id}/study-room`
   - `/students/{user_id}/profile`
7. 后端从 SQLite 数据库读取该学生、班级、题型、反馈、自习、排行等数据。
8. 前端把接口数据渲染到五个手机页面里。

## 3. 前端文件说明

前端主目录是：

`prototypes/student-mobile-v0.1/`

### 3.1 页面入口

| 文件 | 负责内容 | 什么时候改 |
| --- | --- | --- |
| `index.html` | 手机端网页骨架、登录框、左侧导航、五个页面容器、引入 CSS/JS | 新增页面、调整导航入口、修改 HTML 容器结构时 |
| `README.md` | 原型说明 | 需要给原型补说明时 |

注意：现在 `index.html` 不再放大量样式和页面逻辑，它主要负责“把页面搭起来并加载资源”。

### 3.2 样式文件

| 文件 | 负责内容 | 什么时候改 |
| --- | --- | --- |
| `styles/design-tokens.css` | 全局设计变量，例如主色、文字色、阴影、字体 | 想统一调整整体色彩、圆角、字体、阴影时 |
| `styles/app.css` | 具体页面样式，包含登录页、今日计划、排行、曲线、自习室、我的页面 | 页面不好看、布局错位、按钮样式、卡片样式、手机端适配时 |

建议：如果只是某个页面的样式问题，优先在 `styles/app.css` 搜索页面相关类名，例如 `profile-`、`study-room-`、`rank-`。

### 3.3 JavaScript 主入口

| 文件 | 负责内容 | 什么时候改 |
| --- | --- | --- |
| `assets/js/app.js` | 全局状态、登录、调用 API、页面切换、事件绑定、提交反馈、自习室开始/暂停/退出、院校搜索弹窗等公共逻辑 | 涉及接口调用、登录跳转、按钮点击、页面之间联动、数据提交时 |

`app.js` 是前端“大脑”。它不主要负责写页面长什么样，而是负责：

- 当前登录的是哪个学生。
- 从后端拿数据。
- 把数据交给五个页面渲染函数。
- 处理按钮点击和提交动作。
- 管理自习室专注计时状态。

### 3.4 五个页面模块

| 文件 | 对应页面 | 负责内容 | 什么时候改 |
| --- | --- | --- | --- |
| `assets/js/pages/plan.js` | 今日计划 | 今日题型卡片、反馈提交区、到期/完成状态展示 | 今日计划页面显示结构要改时 |
| `assets/js/pages/rank.js` | 排行 | 今日打卡榜、本周完成榜、连续坚持榜、勋章墙、下一枚勋章目标 | 排行页榜单展示、榜单卡片、勋章展示要改时 |
| `assets/js/pages/curve.js` | 曲线 | 数学能力成长曲线、最近 14 天热力图、章节掌握度、失分原因比例、最该补强内容 | 曲线页图表和分析模块要改时 |
| `assets/js/pages/study-room.js` | 自习室 | 自习室首页、专注时间选择、当前任务选择、同桌陪伴、专注中页面 | 自习室页面视觉和专注页面结构要改时 |
| `assets/js/pages/profile.js` | 我的 | 学习档案、备考配置、目标院校选择、每日数学学习目标展示 | 我的页面信息展示、院校选择入口要改时 |

这五个文件只负责“把数据变成 HTML”。如果页面按钮点了没反应，通常要看 `app.js`；如果页面显示不好看，通常看对应页面文件和 `app.css`。

### 3.5 前端数据和资源

| 路径 | 负责内容 | 什么时候改 |
| --- | --- | --- |
| `data/app-data.js` | 前端静态兜底数据，用于未登录或本地验证 | 后端数据结构变了，需要同步静态样例时 |
| `data/today-plan.sample.json` | 今日计划样例 JSON | 需要保存接口样例时 |
| `assets/icons/` | SVG 图标 | 新增或替换图标时 |
| `assets/images/` | 页面实际使用的图片 | 替换自习室、题型卡片、头像等图片时 |
| `assets/reference/` | 参考设计图 | 保存你给我的参考图，方便以后照图还原页面 |
| `assets/annotations/` | 设计标注说明 | 记录设计尺寸、间距、视觉说明时 |

## 4. 后端文件说明

后端主目录是：

`backend/`

| 文件 | 负责内容 | 什么时候改 |
| --- | --- | --- |
| `main.py` | FastAPI 入口，定义所有 HTTP 接口路径 | 新增接口、改接口地址、改请求参数时 |
| `services.py` | 核心业务逻辑，包含登录、生成今日计划、排行、曲线、自习室、我的页面、反馈提交 | 数据计算规则、业务逻辑、排行规则、计划生成规则要改时 |
| `db.py` | 数据库连接工具 | 数据库连接方式变化时 |
| `settings.py` | 路径和配置 | 数据库路径、样本数据目录变化时 |
| `seed_db.py` | 把 Excel 表导入 SQLite，并创建表和索引 | 新增数据表、Excel 字段变化、初始化数据库逻辑变化时 |
| `test_flow.py` | 后端业务闭环测试 | 新增接口或关键业务规则后，补测试时 |
| `app.db` | SQLite 数据库文件 | 不建议手动改，应该通过 Excel 和 `seed_db.py` 生成 |
| `uvicorn.out.log` / `uvicorn.err.log` | 后端运行日志 | 排查后端启动或运行错误时 |

### 4.1 当前主要 API

| 接口 | 作用 | 前端主要使用位置 |
| --- | --- | --- |
| `GET /health` | 检查后端是否启动 | 调试用 |
| `GET /` | 返回手机端首页 | 浏览器打开网站时 |
| `POST /auth/login` | 学生账号登录 | `app.js` 登录逻辑 |
| `GET /students/{user_id}/daily-plan` | 获取今日计划 | 今日计划页、自习室任务来源 |
| `GET /students/{user_id}/rankings` | 获取排行页数据 | 排行页 |
| `GET /students/{user_id}/curve` | 获取曲线页数据 | 曲线页 |
| `GET /students/{user_id}/study-room` | 获取自习室数据 | 自习室页 |
| `GET /students/{user_id}/profile` | 获取我的页面数据 | 我的页面 |
| `GET /institutions/search` | 搜索院校 | 我的页面目标院校弹窗 |
| `POST /students/{user_id}/target-school` | 更新目标院校 | 我的页面 |
| `POST /feedback/submit` | 提交今日题型反馈 | 今日计划页 |
| `POST /focus-sessions/start` | 开始专注 | 自习室页 |
| `POST /focus-sessions/{session_id}/pause` | 暂停专注 | 专注中页面 |
| `POST /focus-sessions/{session_id}/resume` | 继续专注 | 专注中页面 |
| `POST /focus-sessions/{session_id}/finish` | 退出并结算专注 | 专注中页面 |

## 5. 数据表说明

当前主要数据表放在：

`data/samples/`

这些 Excel 表是目前比较适合你直接维护的地方。改完后，需要重新导入数据库。

| 表格 | 作用 |
| --- | --- |
| `users.xlsx` | 登录账号、密码、账号状态、学生基础身份 |
| `student_profiles.xlsx` | 学生档案，例如班级、数学类型、目标分、目标院校字段 |
| `classes.xlsx` | 班级信息，例如数二 A01 班 |
| `question_types.xlsx` | 题型总表，记录题型顺序、章节、适用班型等 |
| `questions.xlsx` | 题目总表，每道题关联题型 |
| `daily_plans.xlsx` | 每个学生每日计划 |
| `question_feedbacks.xlsx` | 学生题目反馈记录 |
| `student_progress.xlsx` | 学生当前布置进度，也就是题型/题目的指针 |
| `student_stats.xlsx` | 学生统计数据，例如连续学习、累计学习等 |
| `student_daily_activity.xlsx` | 每日学习记录，用于 14 天热力图、连续学习等 |
| `type_mastery_stats.xlsx` | 章节/题型掌握度数据 |
| `loss_reason_stats.xlsx` | 失分原因比例数据 |
| `priority_recommendations.xlsx` | 最该优先补强的内容 |
| `student_study_goals.xlsx` | 每日数学学习目标，例如默认 3 小时 |
| `study_rooms.xlsx` | 自习室房间信息 |
| `study_room_members.xlsx` | 自习室同桌陪伴、班级成员展示 |
| `focus_sessions.xlsx` | 专注记录 |
| `institutions.xlsx` | 院校名单，用于目标院校搜索 |
| `system_messages.xlsx` | 后端可配置文案，例如完成全部题型后的鼓励语 |
| `user_sessions.xlsx` | 用户会话或登录相关数据 |

建议：以后真正上线前，Excel 适合做“管理后台雏形”，但最终应该改成正式后台页面或数据库管理系统，避免多人同时改 Excel 出现冲突。

## 6. 脚本说明

| 文件 | 作用 | 什么时候用 |
| --- | --- | --- |
| `scripts/build-prototype-data.py` | 从后端或样本数据生成前端静态数据 | 后端数据结构变了，需要同步 `app-data.js` 时 |
| `scripts/verify-prototype-data.mjs` | 验证前端五个页面能正常渲染，检查关键页面逻辑 | 每次改前端后都应该跑 |
| `scripts/split-prototype-frontend.mjs` | 这次拆分前端时使用的机械抽取脚本 | 一般不用再跑，除非要重新从单文件抽取 |

## 7. 常见修改应该去哪里

| 你想改什么 | 优先看哪里 |
| --- | --- |
| 登录后跳转逻辑 | `assets/js/app.js` |
| 今日计划页面长什么样 | `assets/js/pages/plan.js` + `styles/app.css` |
| 提交反馈后如何更新数据 | `assets/js/app.js` + `backend/services.py` |
| 今日计划如何生成 | `backend/services.py` + `question_types.xlsx` + `questions.xlsx` + `student_progress.xlsx` |
| 完成全部题型后的鼓励语 | `system_messages.xlsx` + `backend/services.py` |
| 排行榜排序规则 | `backend/services.py` |
| 排行榜页面样式 | `assets/js/pages/rank.js` + `styles/app.css` |
| 曲线页热力图逻辑 | `backend/services.py` |
| 曲线页图表显示 | `assets/js/pages/curve.js` + `styles/app.css` |
| 自习室专注计时逻辑 | `assets/js/app.js` + `backend/services.py` |
| 自习室页面显示 | `assets/js/pages/study-room.js` + `styles/app.css` |
| 我的页面目标院校搜索 | `assets/js/app.js` + `backend/main.py` + `backend/services.py` + `institutions.xlsx` |
| 新增一个数据字段 | 对应 Excel 表 + `backend/seed_db.py` + `backend/services.py` + 前端页面文件 |
| 新增一个页面 | `index.html` + `assets/js/pages/新页面.js` + `assets/js/app.js` + `styles/app.css` |

## 8. 启动和验证命令

### 8.1 启动后端

在项目根目录 `C:\Users\zhang\Documents\AI督学` 下运行：

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

电脑本机访问：

```text
http://127.0.0.1:8000/
```

手机访问需要电脑和手机在同一个网络下，并使用电脑局域网 IP，例如：

```text
http://电脑IP:8000/
```

### 8.2 重新导入 Excel 到数据库

如果改了 `data/samples/*.xlsx`，通常需要重新生成数据库：

```powershell
.\.venv\Scripts\python.exe -m backend.seed_db
```

注意：如果后端服务正在运行，数据库可能会被占用。需要先停止服务，再重新导入。

### 8.3 验证前端

```powershell
node scripts/verify-prototype-data.mjs
```

这个脚本会检查五个页面是否还能渲染，以及曲线、自习室、我的页面的一些关键逻辑是否还在。

### 8.4 验证后端

```powershell
.\.venv\Scripts\python.exe -m backend.test_flow
```

这个脚本用于检查登录、计划、反馈、自习室、曲线、我的页面等后端闭环。

## 9. 以后如何维护这份文档

每次发生下面这些变化时，都应该更新本文档：

1. 新增、删除、移动了文件。
2. 新增了页面或拆分了页面模块。
3. 新增或修改了 API。
4. 新增或修改了 Excel 数据表字段。
5. 页面功能发生明显变化，例如自习室逻辑、排行规则、今日计划生成规则。
6. 启动命令、验证命令、技术路线发生变化。

推荐更新步骤：

1. 先在文档顶部或底部的“更新记录”加一行日期和变化摘要。
2. 如果新增文件，更新对应的“文件说明”表格。
3. 如果新增接口，更新“当前主要 API”表格。
4. 如果新增数据表或字段，更新“数据表说明”。
5. 如果某个常见修改入口变化，更新“常见修改应该去哪里”。
6. 更新后至少运行一次相关验证命令。

## 10. 更新记录

| 日期 | 更新内容 |
| --- | --- |
| 2026-06-12 | 首次建立代码地图；记录当前前端拆分后的五页面结构、后端 API、数据表、验证命令和维护方法。 |

