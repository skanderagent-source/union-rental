# Local Development

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm
- Access to the shared Supabase project service role key
- R2 read-only credentials for `fast-rental-media`

## Setup

```bash
cd "/home/frenki/Documents/Union Rental"
npm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Fill `apps/backend/.env` with real credentials. Keep `EMAIL_ENABLED=false` locally unless testing email.

Apply the database view (once, in Supabase SQL Editor):

```bash
cat db/sql/union_rental_views.sql
```

Run verification:

```bash
npm run verify-env
npm run lint
npm run build
npm run test
```

## Start

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

- Public site: http://localhost:5174/
- API health: http://localhost:4001/health

## Optional geocoding backfill

```bash
node scripts/geocode-backfill.mjs --limit=25
```
