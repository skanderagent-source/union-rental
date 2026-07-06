# Production Security Checklist

Run this checklist before and after cutover. Automated checks are noted where applicable.

## Secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in VPS `apps/backend/.env` (`chmod 600`) and password manager
- [ ] `R2_SECRET_ACCESS_KEY` and `RESEND_API_KEY` never in Vercel, frontend `.env`, or git
- [ ] `npm run verify-env` passes locally and on VPS after deploy

## R2

- [ ] Token is **read-only** and scoped to `fast-rental-media` bucket only
- [ ] Union Rental backend never uploads or deletes objects

## API surface

- [ ] Public listing responses contain only `PUBLIC_LISTING_FIELDS` + signed media URLs
- [ ] Manually inspect one `/api/public/listings` and one detail response in production for leaks (`code_entree`, `concierge_tel`, `sheet_row_id`)
- [ ] Review `notes` column with product owner — publicly visible by design (legacy parity)
- [ ] No auth routes; no Supabase Auth calls
- [ ] CORS allows production domain only (+ localhost in development)

## Abuse controls

- [ ] Lead rate limit returns 429 after `RATE_LIMIT_LEADS_MAX` rapid posts
- [ ] Honeypot verified in production (201 response, no DB row, no email)
- [ ] `trust proxy` enabled so limits are per-visitor

## Email

- [ ] Resend domain verified (DKIM, SPF, DMARC)
- [ ] User input HTML-escaped in templates
- [ ] Prospect confirmation emails contain no internal data

## Frontend bundle

```bash
grep -ri supabase apps/frontend/dist/assets | wc -l   # expect 0
```

- [ ] No `@supabase/supabase-js` in frontend dependencies
- [ ] No login UI anywhere

## Database lockdown

- [ ] Fast Rental `0006_lockdown_legacy_policies.sql` **not** applied until both new stacks are live
- [ ] After cutover, coordinate applying `0006` with Fast Rental team

## Automated verification (local)

```bash
npm run lint
npm run build
npm run test
npm run verify-env
grep -ri supabase apps/frontend/dist/assets | wc -l
```
