# Production seed

本目录保存数学二公共种子数据与数据库结构定义。它只包含课程公共内容和合成样例，不应包含真实学生、教师、手机号、会话或运行时业务数据。

## 文件职责

- `math2_public_seed_v1.xlsx`：人工可审核的公共种子工作簿。
- `math2_public_seed_v1.validation.json`：最近一次校验摘要。
- `postgres_schema.sql`：首次导入公共种子所需的 PostgreSQL 结构。
- `postgres_runtime_schema.sql`：运行时业务表结构。
- `public_seed_contract.md`：字段和数据约束。
- `source_institutions.tsv`：公开院校条目的可追溯来源清单。

源材料工作簿和中间构建缓存不进入仓库；仓库中的工作簿已清理作者元数据，并由发布检查复核。

## 校验与导入

在仓库根目录执行：

```powershell
$env:PUBLIC_SEED_XLSX_READER = "python"
node scripts/validate-production-seed.mjs --input data/production-seed/math2_public_seed_v1.xlsx
node scripts/import-production-seed.mjs --input data/production-seed/math2_public_seed_v1.xlsx --write-sql tmp/public-seed.sql
```

生成的 SQL 必须人工复核后才能交给 `psql`。已有生产库的日常更新不得重新执行首次导入流程；请按 `deploy/production-safe-update-runbook.md` 操作。
