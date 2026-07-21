# 部署包清单

## 包含

- `backend/**`
- `prototypes/student-mobile-v3.3/**`
- `prototypes/admin-teacher-console-v0.1/**`
- `data/production-seed/**`
- `data/production-seed/postgres_runtime_schema.sql`
- `data/samples/*.xlsx`
- 必要的部署与数据校验脚本
- `requirements.txt`、`.env.production.example`、`.deployignore`、`.gitignore`
- `VERSION`

## 明确排除

- 学生端与管理端测试、截图，以及 `prototypes/student-mobile-v3.3/data/` 下的静态样本；即时预览所需的 `experience-data.js` 是唯一例外。
- `standalone/**`、`docs/**`、根目录 README 与所有 `*.md`。
- `.env`、数据库、SQLite、日志、压缩包、备份、缓存、虚拟环境和临时输出。
- 真实学生/教师数据、服务器运行时数据和生产备份。

清单由 `deploy/create-deploy-package.ps1` 实现，并由 `scripts/verify-deploy-package.mjs` 自动校验关键边界。
