# 部署说明

当前服务版本为 `v2026.07.21`（展示名 `v721`），后端固定提供学生端 `prototypes/student-mobile-v3.3/` 与管理/教师端 `prototypes/admin-teacher-console-v0.1/`。

## 生成并验证部署包

```powershell
.\deploy\create-deploy-package.ps1
node scripts/verify-deploy-package.mjs
```

部署包只包含运行所需代码、公共种子和配置模板；不会包含 Markdown 文档、本地数据库、测试、截图、缓存或独立教师布置卡工具。

## 首次部署

1. 从 `.env.production.example` 创建服务器本地 `.env`，填写强密码、会话密钥与精确的 CORS 来源。
2. 安装 `requirements.txt`，创建 PostgreSQL 数据库。
3. 依次审核并应用 `data/production-seed/postgres_schema.sql` 与 `data/production-seed/postgres_runtime_schema.sql`。
4. 校验公共种子，再生成并审核导入 SQL。
5. 以进程管理器启动 `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`，由 HTTPS 反向代理对外服务。
6. 执行 `python deploy/smoke-test-v3.3-postgres.py`，再检查学生端与管理端登录流程。

健康检查应返回：

```json
{"status":"ok","version":"2026.07.21"}
```

已有生产数据的更新请只使用 [安全更新手册](production-safe-update-runbook.md)，不要覆盖服务器的 `.env`、数据库和备份目录。
