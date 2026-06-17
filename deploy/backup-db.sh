#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ai-tutor}"
DB_PATH="${DB_PATH:-$APP_DIR/backend/app.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/app-$STAMP.db'"
gzip "$BACKUP_DIR/app-$STAMP.db"

find "$BACKUP_DIR" -name 'app-*.db.gz' -type f -mtime +14 -delete

echo "Backup written: $BACKUP_DIR/app-$STAMP.db.gz"
