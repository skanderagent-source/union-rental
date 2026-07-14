# Production Security Checklist

Run this checklist before and after cutover. Automated checks: `npm run security-check`.

## Secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in VPS `apps/backend/.env` (`chmod 600`) and password manager
- [ ] `R2_SECRET_ACCESS_KEY` and `RESEND_API_KEY` never in Vercel, frontend `.env`, or git
- [x] `npm run verify-env` passes locally (structure OK; replace placeholder secrets for live)

## R2

- [ ] Token is **read-only**, S3-compatible, and scoped to Fast Rental's shared R2 bucket only
- [x] Union Rental backend never uploads or deletes objects (code review)

## API surface

- [x] Public listing responses use `PUBLIC_LISTING_FIELDS` whitelist + signed media URLs
- [ ] Manually inspect one `/api/public/listings` and one detail response in production for leaks (`code_entree`, `concierge_tel`, `sheet_row_id`)
- [ ] Review `notes` column with product owner — publicly visible by design (legacy parity)
- [x] No auth routes; no Supabase Auth calls in frontend
- [x] Union backend only mutates `demandes_clients` for callback leads; Fast Rental owns inventory and media writes
- [ ] CORS allows production domain only (+ localhost in development) — verify on VPS after deploy

## Abuse controls

- [ ] Lead rate limit returns 429 after `RATE_LIMIT_LEADS_MAX` rapid posts (verify live: `npm run smoke` with real credentials)
- [ ] Honeypot verified in production (201 response, no DB row, no email)
- [x] `trust proxy` enabled so limits are per-visitor

## Email

- [ ] Resend domain verified (DKIM, SPF, DMARC)
- [x] User input HTML-escaped in templates (`esc()` in `templates.ts`)
- [x] Prospect confirmation emails contain no internal data (template review)

## Frontend bundle

```bash
grep -ri supabase apps/frontend/dist/assets | wc -l   # expect 0
```

- [x] No `@supabase/supabase-js` in frontend dependencies
- [x] No login UI anywhere

## Database lockdown

- [ ] Fast Rental `0006_lockdown_legacy_policies.sql` **not** applied until both new stacks are live
- [ ] After cutover, coordinate applying `0006` with Fast Rental team

## Automated verification (local)

```bash
npm run lint
npm run build
npm run test
npm run verify-env
npm run security-check
grep -ri supabase apps/frontend/dist/assets | wc -l
```

All automated commands above pass in the current repo.
