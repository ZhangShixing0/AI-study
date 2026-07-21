# Admin / Teacher Console v0.11

这是当前集成的管理/教师控制台。目录名保留 `v0.1` 以兼容既有部署路径，产品逻辑版本为 `v0.11`。

控制台由后端在 `/admin-console/` 提供，支持管理员与教师角色、账号管理、学生进度查看、布置任务、错题处理和审计相关流程。身份、权限和数据均以后端为准，前端不得硬编码生产凭据或绕过角色校验。

## 本地运行

```powershell
python -m backend.seed_db
python -m uvicorn backend.main:app --reload
```

访问 `http://127.0.0.1:8000/admin-console/`。首次管理员密码必须通过环境变量提供；仓库不附带可用于生产的默认密码。

修改后运行仓库级检查：

```powershell
python scripts/run_release_checks.py
```
