# Zero-Gap Guide — Finish Phases 19–25

Everything in phases 1–18 is implemented in the repo. Complete these steps to go live.

## 1. Credentials (blocks live smoke + deploy)

Edit `apps/backend/.env` with real values from the password manager / dashboards:

| Variable | Source |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare R2 read-only token for `fast-rental-media` |
| `GEOCODING_USER_AGENT` | `UnionRental/1.0 you@yourdomain.com` (real contact email) |
| `RESEND_API_KEY` | Resend dashboard (optional until email testing) |

Placeholders like `your-service-role-key` are detected by `npm run verify-env`.

## 2. Database (once)

In Supabase SQL Editor:

1. Run checks from `docs/database.md`
2. If missing objects: `db/sql/0000_fast_rental_dependencies.sql`
3. Always: `db/sql/union_rental_views.sql`

Verify: `npm run verify-db`

## 3. Local smoke

```bash
npm run geocode-backfill -- --limit=25
npm run dev:backend    # terminal 1
npm run dev:frontend   # terminal 2
npm run smoke
```

Manual UI: `docs/smoke-test.md`

## 4. GitHub (Phase 20)

```bash
# Install GitHub CLI: sudo apt install gh && gh auth login
gh repo create union-rental --private --source=. --remote=origin --push
```

Or manually add remote and push. Never commit `.env` files.

## 5. Vercel (Phase 21)

```bash
npx vercel link
VITE_API_BASE_URL=https://api.YOUR_UNION_DOMAIN \
VITE_SITE_URL=https://YOUR_UNION_DOMAIN \
./scripts/deploy-vercel.sh
```

Vercel project settings: build `npm run build --workspace @union-rental/shared && npm run build --workspace @union-rental/frontend`, output `apps/frontend/dist`.

## 6. VPS (Phase 22)

On the Hostinger VPS:

```bash
./scripts/vps-first-time-setup.sh   # skip if Fast Rental already set up the host
git clone YOUR_GITHUB_REPO_URL /var/www/union-rental
cd /var/www/union-rental
cp apps/backend/.env.example apps/backend/.env
# fill production .env, chmod 600
./scripts/deploy-vps.sh
sudo tee -a /etc/caddy/Caddyfile < deploy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 7. DNS + Resend (Phase 23)

See `docs/dns.md`, then `npm run post-dns`.

## 8. Security sign-off (Phase 24)

```bash
npm run security-check
```

Complete unchecked items in `docs/security.md` on production.

## 9. Cutover (Phase 25)

Only after production smoke passes:

1. Deploy `legacy/cutover-vercel-redirect.json` to the **old** static Vercel project
2. Update Fast Rental `CLIENT_SITE_URL` → `https://YOUR_UNION_DOMAIN`
3. Coordinate Fast Rental `0006_lockdown_legacy_policies.sql` once both stacks are live
4. E2E: old URL with `?listing=&ref=` → new site → lead → Fast Rental admin → emails

## One command (offline + live when ready)

```bash
npm run apply-ops
```

Status manifest: `docs/ops-phase-status.json`
