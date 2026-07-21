<div align="center">

# AI 督学

**把考研数学二的每日计划、做题反馈、成长复盘和教师运营放进一套可验证的督学系统。**

[![CI](https://github.com/ZhangShixing0/AI-study/actions/workflows/ci.yml/badge.svg)](https://github.com/ZhangShixing0/AI-study/actions/workflows/ci.yml)
![Python 3.13 tested](https://img.shields.io/badge/Python-3.13%20tested-3776AB)
![Node.js 22 tested](https://img.shields.io/badge/Node.js-22%20tested-339933)
![Release v2026.07.21](https://img.shields.io/badge/release-v2026.07.21-0F766E)

</div>

> [!IMPORTANT]
> 当前版本是私有内测发布候选，不是通用 SaaS。仓库不包含真实学生数据库、生产环境变量、运行日志、部署备份或截图缓存；生产部署必须使用 PostgreSQL，并在首次启动前设置独立的管理员初始口令。

## 项目解决什么问题

AI 督学围绕“当天做什么、做完如何反馈、老师如何跟进、下一步如何调整”建立闭环：

| 使用者 | 主要流程 | 当前入口 |
| --- | --- | --- |
| 学生 | 登录、今日计划、逐题反馈、成长曲线、自习室、个人档案 | `http://127.0.0.1:8000/` |
| 教师 | 今日提醒、学生查询、班级查看、只读跟进 | `http://127.0.0.1:8000/admin-console/` |
| 管理员 | 账号、班级、教师、学生、续费、计划覆盖和审计操作 | `http://127.0.0.1:8000/admin-console/` |
| 教师辅助工具 | 从公共题目数据生成“今日做题任务图” | `standalone/teacher-assignment-card-v0.1/` |

## 已实现能力

- 学生端五页面闭环，包含真实 API、会话恢复、每日计划、题目反馈、章节小结、成长统计和自习室。
- 管理员/教师后台，包含角色权限、TOTP 高风险授权、账号生命周期、班级与教师管理、错题导出和计划起点覆盖。
- FastAPI 后端同时支持本地 SQLite 样例联调与生产 PostgreSQL。
- 数学二公共种子数据的校验、PostgreSQL upsert SQL 生成和本地 SQLite 导出。
- 独立教师任务图工具，可按书目、章节、题型和班型生成可分享图片。

## 系统组成

| 组件 | 入口 | 责任 |
| --- | --- | --- |
| FastAPI 后端 | `backend/main.py` | API、鉴权、业务规则、静态入口 |
| 学生端 v3.3 | `prototypes/student-mobile-v3.3/` | 手机端学习闭环 |
| 管理员/教师后台 v0.11 | `prototypes/admin-teacher-console-v0.1/` | 后台运营与教师工作台；目录名为兼容旧部署保留 |
| 教师任务图 v0.1 | `standalone/teacher-assignment-card-v0.1/` | 独立本地工具，不进入服务器部署包 |
| 公共种子数据 | `data/production-seed/` | 数学二公共题型、题目、章节、书目与班级基础数据 |
| 本地样例数据 | `data/samples/` | 仅用于开发测试的合成数据 |

更完整的数据流见 [系统架构](docs/architecture.md)。

## 快速开始（本地启动）

### 前提

- Python 3.13（本次发布验证版本）
- Node.js 22（运行完整检查和种子校验时需要）

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m backend.seed_db
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

打开：

- 学生端：<http://127.0.0.1:8000/>
- 管理员/教师后台：<http://127.0.0.1:8000/admin-console/>
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

完整检查会运行 Python 单元测试、全部 Node 合约测试、工作簿隐私元数据检查、生产种子校验和部署包规则检查：

```powershell
.\.venv\Scripts\python.exe scripts/run_release_checks.py
```

本次发布基线实测通过 120 项 Python 测试和 44 项 Node 测试。

## 教师任务图工具

```powershell
.\.venv\Scripts\python.exe standalone/teacher-assignment-card-v0.1/build-data.py
Set-Location standalone/teacher-assignment-card-v0.1
python -m http.server 8093 --bind 127.0.0.1
```

浏览器访问 <http://127.0.0.1:8093/>。它读取已纳入仓库的公共数学二种子，不读取学生运行数据。

## 项目目录

```text
backend/                              FastAPI、业务服务和后端测试
data/production-seed/                 公共种子、schema 与校验报告
data/samples/                         合成本地样例
deploy/                               打包、初次部署、安全更新与回退
docs/                                 架构、数据表和产品逻辑
prototypes/student-mobile-v3.3/       当前学生端
prototypes/admin-teacher-console-v0.1/ 当前管理员/教师后台
standalone/teacher-assignment-card-v0.1/ 教师任务图工具
scripts/                              数据、验证和发布辅助脚本
```

## 数据与安全边界

- `.env.production`、数据库、SQLite 导出、日志、ZIP、上传文件、截图和浏览器缓存均由 `.gitignore` 排除。
- `data/samples/` 是合成测试数据，不得替换为真实学生导出。
- 生产数据目录不由 FastAPI 或 Nginx 作为静态目录公开。
- 普通代码更新禁止重建、清空或覆盖生产 PostgreSQL。
- Excel 作者元数据通过 `scripts/sanitize_ooxml_metadata.py` 检查。

完整规则见 [SECURITY.md](SECURITY.md) 和 [生产安全更新手册](deploy/production-safe-update-runbook.md)。

## 当前限制

- 当前重点覆盖考研数学二，数学一、数学三尚未形成同等完整的数据链路。
- 前端仍是无构建工具的 HTML/CSS/JavaScript 结构。
- 教师任务图是独立工具，尚未接入后台导航和统一鉴权。
- 本仓库保留旧 Git 历史；本次只从当前发布树移除历史截图和候选大图，没有重写历史。

## 参与开发

提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并运行完整发布检查。版本变化记录在 [CHANGELOG.md](CHANGELOG.md)。

## 许可

当前仓库未授予开源许可，保持私有使用。未经仓库所有者明确授权，不得复制、公开分发或商用。
