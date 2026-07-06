# Scripts

| Script | Purpose |
|--------|---------|
| `verify-env.mjs` | Validate `.env` structure; warn on placeholder secrets |
| `smoke-api.mjs` | Build, test, health + live API smoke (when credentialed) |
| `run-security-checklist.mjs` | Phase 24 automated security checks |
| `apply-ops-phases.mjs` | Run all offline ops phases; live when credentials exist |
| `verify-db-offline.mjs` | SQL artifact checks |
| `verify-db.mjs` | Live Supabase schema checks |
| `verify-r2-offline.mjs` | R2 read-only code checks |
| `verify-r2.mjs` | Live R2 bucket access |
| `verify-deploy-ready.mjs` | Deploy/cutover artifact checks |
| `verify-cutover.mjs` | Cutover repo state |
| `verify-dns.mjs` | DNS propagation (`FRONTEND_DOMAIN`, `API_DOMAIN`) |
| `post-dns-checklist.mjs` | Post-DNS manual reminders |
| `geocode-backfill.mjs` | Manual geocoding backfill |
| `send-test-email.mjs` | Resend test send |
| `extract-legacy-assets.mjs` | Extract base64 images from `legacy/index.html` |
| `extract-legacy-css.mjs` | Extract `:root` → `theme.css`, rest → `legacy-styles.css` |
| `deploy-vercel.sh` | Production Vercel deploy |
| `deploy-vps.sh` | VPS backend deploy |
| `vps-first-time-setup.sh` | Shared VPS base setup |

Run everything: `npm run apply-ops`
