# 安全说明

## 支持范围

安全修复优先进入当前发布分支及后续版本。历史原型和已归档版本不再单独维护。

## 报告问题

请通过 GitHub 私有仓库联系仓库所有者，不要在截图、Issue、提交信息或日志中粘贴真实口令、TOTP 密钥、数据库连接串、学生信息或服务器地址。

报告应包含：

- 受影响版本和入口；
- 可复现步骤；
- 预期与实际结果；
- 已脱敏的日志或请求结构；
- 是否可能影响真实学生数据。

## 仓库边界

禁止提交：

- `.env*` 实际配置、API 密钥、口令、私钥和 TOTP 密钥；
- `*.db`、`*.sqlite*`、数据库 dump、生产备份和部署 ZIP；
- 真实姓名、手机号、QQ、身份证号、学生表格或客户导出；
- `outputs/`、`tmp/`、截图、Playwright 报告和浏览器缓存；
- 服务器 IP、个人绝对路径和本地工具缓存路径。

允许进入仓库的表格必须是公共种子或合成测试数据，并通过：

```powershell
python scripts/sanitize_ooxml_metadata.py data --check
```

## 运行时要求

- `APP_ENV=production` 时必须设置 `DATABASE_URL` 和 `ADMIN_INITIAL_PASSWORD`。
- 默认不开放跨域；只有前后端分离部署时才配置 `CORS_ALLOWED_ORIGINS`。
- 生产 PostgreSQL、`.env.production` 和上传目录由服务器持有，不进入部署包覆盖范围。
- 高风险后台操作使用 TOTP 授权与审计日志。
- 普通更新不得执行建库、schema 重建或公共种子重导入。

## 发布门槛

发布前必须运行：

```powershell
python scripts/run_release_checks.py
```

并再次检查暂存区中没有敏感文件、数据库、归档、日志和运行时输出。
