# Local Development

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- npm
- Access to the shared Supabase project service role key
- R2 read-only S3-compatible credentials for the same bucket Fast Rental uses

## Setup

```bash
cd "/home/frenki/Documents/Union Rental"
npm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Fill `apps/backend/.env` with real credentials. Keep `EMAIL_ENABLED=false` locally unless testing email.

For cross-app media testing with Fast Rental's local disk driver (default when R2 keys
start with `cfat_`), Union auto-detects `../Fast Rental/apps/backend/.local-storage`
in development and serves those files through its own API. For production-like local
testing, run Fast Rental with `STORAGE_DRIVER=r2` and the same bucket instead.

Apply Fast Rental migrations through `0012_demandes_clients_listing_id.sql` before
starting Union. Migration `0011` creates the database view; do not run `db push`
from this repository.

Run verification:

```bash
npm run verify-env
npm run lint
npm run build
npm run test
npm run smoke
npm run security-check
npm run apply-ops
```

Manual UI checklist: `docs/smoke-test.md`

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

## Shared-data ownership

Use Fast Rental to import, edit, geocode, approve, or reorder listings and media. Union Rental
only reads the shared inventory and creates callback leads.
