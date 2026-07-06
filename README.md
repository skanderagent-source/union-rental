# Union Rental (LogiGo Public Site)

Public customer-facing site for browsing available rental listings and submitting callback / pre-qualification leads. Sister app to Fast Rental — both share the same Supabase database and Cloudflare R2 media bucket.

## Local setup

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
npm run extract-legacy-assets   # if src/assets/ is empty
npm run extract-legacy-css      # refresh theme + legacy CSS from legacy/index.html
npm run verify-env
npm run dev:backend   # port 4001
npm run dev:frontend  # port 5174
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run build` | Build shared, backend, frontend |
| `npm run test` | Backend Vitest suite |
| `npm run lint` | Typecheck all workspaces |
| `npm run verify-env` | Validate `.env` files |
| `npm run smoke` | Build, test, and API smoke checks |
| `npm run security-check` | Automated security checklist |
| `npm run apply-ops` | Run all offline ops phases + live when credentialed |
| `npm run extract-legacy-assets` | Extract base64 images from legacy HTML |
| `npm run extract-legacy-css` | Extract legacy CSS into theme + legacy-styles |
| `npm run apply-cutover` | Generate Vercel redirect for old static project |
| `npm run geocode-backfill` | Manual geocoding backfill |

## Architecture

- **Frontend**: React + Vite on Vercel (port 5174 locally)
- **Backend**: Node + Express on VPS behind Caddy (port 4001 locally)
- **Database**: Shared Supabase project (schema owned by Fast Rental repo)
- **Media**: Read-only signed URLs from `fast-rental-media` R2 bucket
- **Email**: Resend (backend only)

See `docs/local-development.md`, `docs/deployment.md`, `docs/database.md`, `docs/operations.md`, `docs/security.md`, and `docs/zero-gap-guide.md`.

## Production checklist

- [ ] Resend domain verified
- [ ] R2 read-only token scoped to bucket
- [ ] Service role key only on VPS (chmod 600)
- [ ] No Supabase keys in frontend bundle
- [ ] Rate limits verified
- [ ] Legacy site redirected to new domain
