<div align="center">

# AI 督学

<picture>
  <source media="(max-width: 640px)" srcset="docs/assets/readme-hero-mobile.svg">
  <img src="docs/assets/readme-hero.svg" alt="AI 督学 v721：连接学生计划、学习反馈与教师跟进的学习闭环" width="100%">
</picture>

**让今日计划、逐题反馈与教师跟进，连成一条学习闭环。**

面向考研数学二 · 学生端 v3.3 · 管理 / 教师后台 v0.11

[观看视频](#项目介绍视频) · [产品一览](#产品一览) · [立即体验](#先体验再运行) · [版本中心](#版本中心) · [开发文档](#快速开始)

[![CI](https://github.com/ZhangShixing0/AI-study/actions/workflows/ci.yml/badge.svg)](https://github.com/ZhangShixing0/AI-study/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-v2026.07.21-14b8a6)](https://github.com/ZhangShixing0/AI-study/releases/tag/v2026.07.21)
![Status](https://img.shields.io/badge/status-private%20beta-64748b)

</div>

> [!NOTE]
> 产品处于**内测阶段**，仓库公开展示。视频与体验模式使用合成样例；使用范围见[许可](#许可)，生产部署要求见[安全说明](SECURITY.md)。

## 项目介绍视频

约 **2 分钟**了解 AI 督学的学习闭环、学生端 v3.3、管理 / 教师后台 v0.11，以及本地运行方式。视频中的产品画面使用仓库内合成样例。

https://github.com/user-attachments/assets/df4f9160-ce2e-4735-9acc-44d51d8e8a73

[1080p 完整原片（MP4，约 23 MB）](docs/assets/ai-duxue-intro.mp4)

<details>
<summary>查看视频章节</summary>

| 时间 | 内容 |
| --- | --- |
| 00:00 | 备考困扰与项目介绍 |
| 00:20 | 计划、反馈与教师跟进的学习闭环 |
| 00:33 | 学生端：今日计划、逐题反馈、成长与薄弱点 |
| 01:00 | 管理 / 教师后台与教师任务图工具 |
| 01:20 | 系统架构、本地启动与发布检查 |

</details>

## 产品一览

从每天做什么，到做完后发现什么。以下为学生端内置体验模式的实际界面，图中数值为合成演示数据。

<a href="docs/assets/student-experience-tour.png">
  <picture>
    <source media="(max-width: 640px)" srcset="docs/assets/student-experience-mobile.png">
    <img src="docs/assets/student-experience-tour.png" alt="学生端实际体验：计划、反馈与成长，点击查看完整展示" width="100%">
  </picture>
</a>

<sub>点击图片查看完整展示。</sub>

**学生端**查看计划、提交反馈、回看薄弱点；**教师端**查询学习情况并跟进。教师后台与任务图工具的画面可在上方视频的 **01:00** 起查看。

## 先体验再运行

已有 Python 时，在仓库根目录运行下面一条命令，即可浏览学生端内置体验模式：

```powershell
python -m http.server 8094 --bind 127.0.0.1 --directory prototypes/student-mobile-v3.3
```

打开 <http://127.0.0.1:8094/>，点击 **「立即体验」**。

1. **看计划**：查看今日题型、书目、章节与题号。
2. **试反馈**：选择正确 / 错误及错因，提交后查看完成状态与章节小结。
3. **看成长**：切换「成长」，浏览学习热力图、章节掌握度和错因诊断。

体验模式在浏览器内使用静态合成数据，无需登录或初始化数据库；反馈仅用于页面演示。它不连接教师后台，也不代表真实学习效果。完整步骤见[体验指南](docs/experience-guide.md)，运行完整系统见[快速开始](#快速开始)。

## 版本中心

**当前推荐：v721 · v2026.07.21**

学生端 v3.3 / 管理与教师后台 v0.11 / 教师任务图 v0.1

[查看当前 Release](https://github.com/ZhangShixing0/AI-study/releases/tag/v2026.07.21) · [浏览该版本源码](https://github.com/ZhangShixing0/AI-study/tree/v2026.07.21) · [更新记录](CHANGELOG.md)

<details>
<summary>查看历史版本</summary>

| 版本 | 定位与入口 |
| --- | --- |
| v617_MVP | [结构化整理前的 main 基线](https://github.com/ZhangShixing0/AI-study/tree/v617_MVP) |
| v612_MVP | [更早的 MVP 快照](https://github.com/ZhangShixing0/AI-study/tree/v612_MVP) |
| v609_1 | [早期版本快照](https://github.com/ZhangShixing0/AI-study/tree/v609_1) |

全部历史快照见 [Tags 页面](https://github.com/ZhangShixing0/AI-study/tags)。

</details>

## 项目解决什么问题

AI 督学解决的不是单个“打卡”动作，而是让计划、反馈、判断和跟进形成连续证据链：

```mermaid
flowchart LR
    PLAN["学生 · 今日计划"] --> DO["执行 · 逐题记录"]
    DO --> FEEDBACK["反馈 · 掌握 / 模糊 / 错题"]
    FEEDBACK --> REVIEW["系统 · 成长与风险信号"]
    REVIEW --> TEACHER["教师 · 查询与跟进"]
    TEACHER --> NEXT["下一轮计划调整"]
    NEXT --> PLAN
```

| 工作面 | 核心任务 | 当前入口 |
| --- | --- | --- |
| **学生端** | 今日计划、逐题反馈、章节小结、成长曲线、自习室与个人档案 | `http://127.0.0.1:8000/` |
| **教师 / 管理后台** | 今日提醒、学生与班级查询、只读跟进、账号与计划运营 | `http://127.0.0.1:8000/admin-console/` |
| **教师任务图工具** | 从公共题目数据生成可分享的“今日做题任务图” | `standalone/teacher-assignment-card-v0.1/` |

## 当前交付范围

| 组件 | 当前版本 | 责任 |
| --- | --- | --- |
| FastAPI 后端 | v721 | API、鉴权、业务规则、运行入口 |
| 学生端 | v3.3 | 手机端五页面学习闭环 |
| 管理 / 教师后台 | v0.11 | 运营后台与教师工作台；目录名为兼容旧部署保留 v0.1 |
| 教师任务图 | v0.1 | 独立本地工具，不进入服务器部署包 |
| 数学二公共种子 | v721 基线 | 题型、题目、章节、书目和班级基础数据 |

已实现角色权限、学生会话、每日计划、逐题反馈、章节复盘、成长统计、TOTP 高风险授权、公共种子校验、PostgreSQL upsert 生成和安全更新流程。更完整的运行关系见 [系统架构](docs/architecture.md)。

## 快速开始

### 环境要求

- Python 3.13（本次发布验证版本）
- Node.js 22（运行完整检查和种子校验时需要）

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m backend.seed_db
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

启动后打开：

- 学生端：<http://127.0.0.1:8000/>
- 管理 / 教师后台：<http://127.0.0.1:8000/admin-console/>
- API 文档：<http://127.0.0.1:8000/docs>

健康检查：

```powershell
curl.exe http://127.0.0.1:8000/health
```

预期返回包含：

```json
{"status":"ok","version":"2026.07.21"}
```

## 验证项目

一条命令会运行 Python 单元测试、Node 合约测试、工作簿隐私元数据检查、生产种子校验和部署包规则检查：

```powershell
.\.venv\Scripts\python.exe scripts/run_release_checks.py
```

v721 发布基线已通过 **120 项 Python 测试、44 项 Node 测试**，并完成 24 个生产种子工作簿的隐私元数据检查。

## 教师任务图工具

```powershell
.\.venv\Scripts\python.exe standalone/teacher-assignment-card-v0.1/build-data.py
Set-Location standalone/teacher-assignment-card-v0.1
python -m http.server 8093 --bind 127.0.0.1
```

访问 <http://127.0.0.1:8093/>。该工具只读取已纳入仓库的公共数学二种子，不读取学生运行数据。

<details>
<summary><strong>查看项目目录</strong></summary>

```text
backend/                                FastAPI、业务服务和后端测试
data/production-seed/                   公共种子、schema 与校验报告
data/samples/                           合成本地样例
deploy/                                 打包、初次部署、安全更新与回退
docs/                                   架构、数据表和产品逻辑
prototypes/student-mobile-v3.3/         当前学生端
prototypes/admin-teacher-console-v0.1/  当前管理 / 教师后台
standalone/teacher-assignment-card-v0.1/ 教师任务图工具
scripts/                                数据、验证和发布辅助脚本
```

</details>

<details>
<summary><strong>查看数据与安全边界</strong></summary>

- `.env.production`、数据库、SQLite 导出、日志、ZIP、上传文件、截图和浏览器缓存均由 `.gitignore` 排除。
- `data/samples/` 只允许存放合成测试数据，不得替换为真实学生导出。
- `data/`、`deploy/`、`docs/` 和服务器环境文件不由 FastAPI 作为静态目录公开。
- 普通代码更新禁止重建、清空或覆盖生产 PostgreSQL。
- Excel 作者元数据由 `scripts/sanitize_ooxml_metadata.py` 检查。

部署前请阅读 [SECURITY.md](SECURITY.md) 和 [生产安全更新手册](deploy/production-safe-update-runbook.md)。

</details>

<details>
<summary><strong>查看当前限制</strong></summary>

- 当前重点覆盖考研数学二；数学一、数学三尚未形成同等完整的数据链路。
- 前端仍是无构建工具的 HTML / CSS / JavaScript 结构。
- 教师任务图是独立工具，尚未接入后台导航和统一鉴权。
- 仓库保留旧 Git 历史；v721 只从当前发布树移除了历史截图和候选大图，没有重写历史。

</details>

## 参与开发

提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并运行完整发布检查。安全问题请按照 [SECURITY.md](SECURITY.md) 的方式报告。

## 许可

本仓库公开展示项目，产品仍处于内测阶段；当前未授予开源许可。未经仓库所有者明确授权，不得复制、公开分发或商用。
