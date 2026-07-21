# AI 督学正式服务器安全更新手册

## 适用范围

本手册用于以下场景：

- 正式服务器已经运行 AI 督学。
- PostgreSQL 中已经存在正式学生数据。
- 使用新的 `ai-tutor-deploy-YYYYMMDD-HHMMSS.zip` 更新程序。
- 域名、Nginx、PostgreSQL 和 `ai-tutor.service` 已经配置完成。

本手册不是首次空服务器安装说明。首次部署、清空测试库或重新导入公共种子数据必须使用单独流程，不能与本手册混用。

## 交给其他对话时的提示词

可以把本文件发送给其他对话，并附上下面这段话：

> 请严格按照《AI 督学正式服务器安全更新手册》指导我部署。服务器已有正式 PostgreSQL 学生数据，禁止清库、禁止重新导入 schema、禁止重新导入 Excel 公共种子。每次只给我一个阶段的命令，等我回传结果并确认无误后再继续。若任何校验失败，立即停止，不要猜测性修复。

## 核心安全原则

1. 部署前必须备份 PostgreSQL 和 `.env.production`。
2. 不删除当前 release，不覆盖当前 release 内的文件。
3. 新版本解压到新的 `/opt/ai-tutor-release-*` 目录。
4. 新版本使用独立 `.venv`，安装依赖时旧服务继续运行。
5. 只在最后一步切换 `/opt/ai-tutor-current` 软链接并重启服务。
6. 新版本健康检查失败时立即把软链接切回旧 release。
7. 更新部署绝不执行 `DROP DATABASE`、建库、schema 导入或公共 seed 导入。
8. 不把本地 `.env.production`、SQLite 数据库或测试数据库打入部署包。

## 部署信息

每次部署先替换下面这些值：

```text
LOCAL_PACKAGE = C:\path\to\ai-tutor-deploy-YYYYMMDD-HHMMSS.zip
PACKAGE_NAME  = ai-tutor-deploy-YYYYMMDD-HHMMSS.zip
PACKAGE_SHA256 = 本地计算出的 SHA256
SERVER_USER   = ubuntu
SERVER_IP     = 正式服务器公网 IP
DOMAIN        = www.example.com
```

`PACKAGE_NAME` 中的时间戳同时用于新 release 目录名。

## 第一阶段：本地生成并校验部署包

在 Windows PowerShell 中进入当前正式开发基线工作树。当前项目应从 `codex/v3.3-integration` 分支打包：

```powershell
cd "C:\path\to\AI-study"

git status --short
git branch --show-current
git log -3 --oneline
```

`git status --short` 应为空。确认无误后生成部署包：

```powershell
.\deploy\create-deploy-package.ps1
```

取得最新部署包和 SHA256：

```powershell
$Package = Get-ChildItem .\dist\ai-tutor-deploy-*.zip |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$Package | Select-Object FullName,Length,LastWriteTime
Get-FileHash -LiteralPath $Package.FullName -Algorithm SHA256
```

把最终包保存到本地备份目录：

```powershell
New-Item -ItemType Directory -Force ".\deploy-package-backups" | Out-Null

Copy-Item -LiteralPath $Package.FullName -Destination ".\deploy-package-backups" -Force
```

## 第二阶段：上传压缩包

在 Windows PowerShell 执行，替换本地路径和服务器 IP：

```powershell
scp "LOCAL_PACKAGE" SERVER_USER@SERVER_IP:/tmp/
```

上传只会向服务器 `/tmp` 写入一个 zip，不会影响正在运行的网站和数据库。

## 第三阶段：服务器校验压缩包

SSH 登录正式服务器后执行，替换包名和 SHA256：

```bash
set -e

ZIP="/tmp/PACKAGE_NAME"
EXPECTED_SHA256="把期望的 SHA256 改成小写"

ls -lh "$ZIP"

ACTUAL_SHA256=$(sha256sum "$ZIP" | awk '{print $1}')
echo "ACTUAL_SHA256=$ACTUAL_SHA256"

test "$ACTUAL_SHA256" = "$EXPECTED_SHA256" || {
  echo "压缩包 SHA256 不一致，停止部署"
  exit 1
}

unzip -t "$ZIP" > /tmp/ai-tutor-unzip-test.log
tail -n 5 /tmp/ai-tutor-unzip-test.log
```

只有出现 `No errors detected in compressed data` 才能继续。

## 第四阶段：备份正式数据库和环境配置

该阶段只有读取和备份操作，不会修改数据库：

```bash
set -e

CURRENT_DIR=$(readlink -f /opt/ai-tutor-current)
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/opt/ai-tutor-backups"

echo "CURRENT_DIR=$CURRENT_DIR"
test -f "$CURRENT_DIR/.env.production"

sudo mkdir -p "$BACKUP_DIR"
sudo chown ubuntu:ubuntu "$BACKUP_DIR"

cp "$CURRENT_DIR/.env.production" \
  "/tmp/ai-tutor.env.production.$STAMP"

set -a
source "$CURRENT_DIR/.env.production"
set +a

psql "$DATABASE_URL" -c "SELECT current_database(), current_user;"

pg_dump "$DATABASE_URL" -Fc \
  -f "$BACKUP_DIR/ai_tutor-pre-update-$STAMP.dump"

ls -lh "$BACKUP_DIR/ai_tutor-pre-update-$STAMP.dump"
```

可选的部署前只读计数：

```bash
psql "$DATABASE_URL" -P pager=off -c "
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'daily_plans', COUNT(*) FROM daily_plans
UNION ALL SELECT 'question_feedbacks', COUNT(*) FROM question_feedbacks;
"
```

## 第五阶段：解压并安装新版本

把 `PACKAGE_NAME` 的时间戳填入 `NEW_RELEASE`：

```bash
set -e

ZIP="/tmp/PACKAGE_NAME"
NEW_RELEASE="/opt/ai-tutor-release-YYYYMMDD-HHMMSS"
CURRENT_DIR=$(readlink -f /opt/ai-tutor-current)

test -f "$ZIP"
test -f "$CURRENT_DIR/.env.production"
test ! -e "$NEW_RELEASE" || {
  echo "$NEW_RELEASE 已存在，停止操作，禁止直接覆盖"
  exit 1
}

sudo mkdir -p "$NEW_RELEASE"
sudo unzip -q "$ZIP" -d "$NEW_RELEASE"
sudo chown -R ubuntu:ubuntu "$NEW_RELEASE"

cp "$CURRENT_DIR/.env.production" "$NEW_RELEASE/.env.production"
chmod 600 "$NEW_RELEASE/.env.production"

cd "$NEW_RELEASE"
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m py_compile backend/main.py backend/services.py
```

此时旧版本仍在 8000 端口运行，正式用户不受安装依赖过程影响。

## 第六阶段：切换版本并自动回退

确认第五阶段无错误后执行：

```bash
set -e

NEW_RELEASE="/opt/ai-tutor-release-YYYYMMDD-HHMMSS"
OLD_RELEASE=$(readlink -f /opt/ai-tutor-current)

echo "OLD_RELEASE=$OLD_RELEASE"
echo "NEW_RELEASE=$NEW_RELEASE"

test -x "$NEW_RELEASE/.venv/bin/python"
test -f "$NEW_RELEASE/.env.production"

sudo ln -sfn "$NEW_RELEASE" /opt/ai-tutor-current

DEPLOY_OK=0
if sudo systemctl restart ai-tutor; then
  sleep 5
  if curl -fsS http://127.0.0.1:8000/health; then
    DEPLOY_OK=1
  fi
fi

if [ "$DEPLOY_OK" -ne 1 ]; then
  echo "新版本启动失败，正在自动回退"
  sudo ln -sfn "$OLD_RELEASE" /opt/ai-tutor-current
  sudo systemctl restart ai-tutor
  sleep 5
  curl -fsS http://127.0.0.1:8000/health
  exit 1
fi

echo
echo "新版本健康检查通过"
readlink -f /opt/ai-tutor-current
sudo systemctl status ai-tutor --no-pager -l | head -n 30
```

## 第七阶段：公网验收

替换正式域名：

```bash
DOMAIN="www.example.com"

curl -sS -o /dev/null -w "health %{http_code}\n" \
  "https://$DOMAIN/health"

curl -sS -o /dev/null -w "student %{http_code}\n" \
  "https://$DOMAIN/"

curl -sS -o /dev/null -w "admin %{http_code}\n" \
  "https://$DOMAIN/admin-console/"
```

预期三项都为 `200`。然后检查本次版本涉及的关键静态资源或文案，例如：

```bash
curl -sS -o /dev/null -w "police-icon %{http_code}\n" \
  "https://$DOMAIN/assets/icons/beian-police.png"

curl -sS "https://$DOMAIN/" | grep "豫公网安备41108202000963号"
```

最后在浏览器中人工检查：

1. 学生登录和今日计划。
2. “我的”页面及本次新增功能入口。
3. 管理员登录和核心列表。
4. 页脚备案信息。

## 第八阶段：部署后数据库只读确认

```bash
cd /opt/ai-tutor-current

set -a
source .env.production
set +a

psql "$DATABASE_URL" -c "SELECT current_database(), current_user;"

psql "$DATABASE_URL" -P pager=off -c "
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'daily_plans', COUNT(*) FROM daily_plans
UNION ALL SELECT 'question_feedbacks', COUNT(*) FROM question_feedbacks;
"
```

正式用户可能在部署期间继续产生数据，因此计数不要求与部署前完全相等，但不应突然归零。

## 手动回退

只有新版本运行异常时才执行。把 `OLD_RELEASE` 替换为部署前记录的目录：

```bash
set -e

OLD_RELEASE="/opt/ai-tutor-release-旧版本时间戳"

test -x "$OLD_RELEASE/.venv/bin/python"
test -f "$OLD_RELEASE/.env.production"

sudo ln -sfn "$OLD_RELEASE" /opt/ai-tutor-current
sudo systemctl restart ai-tutor
sleep 5

curl -fsS http://127.0.0.1:8000/health
readlink -f /opt/ai-tutor-current
```

程序回退通常不需要恢复数据库。只有确认新版本执行了错误的数据写入，并经过人工判断后，才考虑使用 `pg_restore`。禁止在原因不明时直接恢复数据库备份。

## 更新部署禁止执行的命令

已有正式学生数据时，其他对话不得执行或建议执行以下操作：

```text
DROP DATABASE
CREATE DATABASE
dropdb
createdb
postgres_runtime_schema.sql
postgres_schema.sql
import-production-seed.mjs
math2_public_seed_import*.sql
清空 users、student_profiles、daily_plans、question_feedbacks
删除 /opt/ai-tutor-current 当前指向的旧 release
用新包中的文件覆盖旧 release 目录
```

如果新版本确实包含数据库迁移，必须先单独审查迁移内容、备份数据库并制定回退方案，不能套用普通静态或后端程序更新流程直接执行。

## 部署完成标准

满足以下全部条件才算完成：

- 压缩包 SHA256 与本地一致。
- PostgreSQL 备份文件存在且非空。
- `.env.production` 已从旧 release 复制到新 release。
- `/opt/ai-tutor-current` 指向新 release。
- `ai-tutor.service` 为 `active (running)`。
- 本机 `/health` 返回 `200`。
- 公网学生端、管理员端和 `/health` 均返回 `200`。
- 正式数据库可连接，关键表计数没有异常归零。
- 旧 release 仍然保留，可随时回退。
