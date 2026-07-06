#!/usr/bin/env bash
# Phase 21: Deploy frontend to Vercel
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${VITE_API_BASE_URL:?Set VITE_API_BASE_URL (e.g. https://api.YOUR_UNION_DOMAIN)}"
: "${VITE_SITE_URL:?Set VITE_SITE_URL (e.g. https://YOUR_UNION_DOMAIN)}"

echo "Building frontend…"
npm ci
npm run build --workspace @union-rental/shared
npm run build --workspace @union-rental/frontend

echo "Deploying to Vercel…"
npx vercel deploy --prod --yes \
  --build-env VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
  --build-env VITE_SITE_URL="${VITE_SITE_URL}"

echo "✓ Deployed. Ensure backend FRONTEND_ORIGIN includes the production domain."
