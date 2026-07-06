#!/usr/bin/env bash
# Phase 22: Deploy backend on VPS (run ON the VPS after clone)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building backend…"
npm ci
npm run build --workspace @union-rental/shared
npm run build --workspace @union-rental/backend

chmod 600 apps/backend/.env 2>/dev/null || true

echo "Starting PM2…"
pm2 delete union-rental-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

sleep 2
curl -sf http://127.0.0.1:4001/health | grep -q '"ok":true'
echo "✓ Backend healthy on :4001"
echo "Configure Caddy with deploy/Caddyfile and reload: sudo systemctl reload caddy"
