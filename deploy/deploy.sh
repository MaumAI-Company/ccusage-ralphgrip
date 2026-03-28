#!/bin/bash
set -euo pipefail

echo "=== Deploying ccusage-ralphgrip ==="

cd /opt/ccusage-ralphgrip

# Pull latest
git pull origin main

# Install deps
pnpm install --frozen-lockfile

# Build dashboard
pnpm --filter dashboard build

# Reload PM2
pm2 reload ccusage-ralphgrip --update-env || pm2 start ecosystem.config.cjs
pm2 save

echo "=== Deploy complete ==="

# Verify
sleep 2
curl -sf http://127.0.0.1:3003/ > /dev/null && echo "✓ Health check passed" || echo "✗ Health check failed"
