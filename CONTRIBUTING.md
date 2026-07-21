# 参与开发

## 工作方式

1. 从最新发布基线创建功能分支。
2. 每个分支只解决一个明确问题。
3. 不在已有脏工作区中批量整理无关文件。
4. 提交前运行完整发布检查。
5. 通过 Pull Request 合并，不直接覆盖 `main`。

## 目录责任

- 学生页面逻辑：`prototypes/student-mobile-v3.3/assets/js/pages/`
- 学生页面样式：`prototypes/student-mobile-v3.3/styles/pages/`
- 管理员/教师后台：`prototypes/admin-teacher-console-v0.1/`
- 后端接口与规则：`backend/main.py`、`backend/services.py`
- 公共数据：`data/production-seed/`
- 教师任务图：`standalone/teacher-assignment-card-v0.1/`

不要在旧原型目录继续开发。

## 必跑检查

```powershell
python scripts/run_release_checks.py
```

如果修改了生产种子：

```powershell
python scripts/sanitize_ooxml_metadata.py data
python scripts/sanitize_ooxml_metadata.py data --check
$env:PUBLIC_SEED_XLSX_READER="python"
node scripts/validate-production-seed.mjs
```

如果修改了部署边界：

```powershell
node scripts/verify-deploy-package.mjs
.\deploy\create-deploy-package.ps1
```

## 数据规则

- 只能提交公共基础数据或明确的合成测试数据。
- 不得将真实学生数据复制到样例表、测试、截图或文档。
- 图片必须是产品运行资产；阶段截图、参考图和候选大图不得重新加入发布树。
- 工作簿不得包含个人作者元数据、隐藏工作表或外部链接。

## Pull Request

PR 说明应包含：

- 用户问题和变更范围；
- 安全与数据影响；
- 验证命令和结果；
- 部署或回退要求；
- 未完成限制。
