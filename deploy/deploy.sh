#!/bin/bash
set -euo pipefail

# SSM에서 HOME이 설정되지 않는 문제 방지
export HOME="${HOME:-/root}"

APP_DIR="/opt/ccusage-ralphgrip"
cd "$APP_DIR"

echo "[deploy] Pulling latest changes..."
git pull origin main

echo "[deploy] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[deploy] Building dashboard..."
pnpm --filter dashboard build

echo "[deploy] Restarting PM2 process..."
pm2 reload ccusage-dashboard --update-env || pm2 start ecosystem.config.cjs

echo "[deploy] Saving PM2 state..."
pm2 save

echo "[deploy] Verifying..."
sleep 3
pm2 list
curl -so /dev/null -w "HTTP status: %{http_code}\n" http://127.0.0.1:3002/ || echo "WARN: dashboard not responding yet"

echo "[deploy] Done."
