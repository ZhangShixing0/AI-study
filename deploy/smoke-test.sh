#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"

curl -fsS "$BASE_URL/health"
echo

curl -fsS \
  -H 'Content-Type: application/json' \
  -d '{"code":"demo-a01"}' \
  "$BASE_URL/auth/test-code" >/dev/null

echo "Smoke test passed: $BASE_URL"
