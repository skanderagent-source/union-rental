# Database

Union Rental **does not own** the Supabase schema. The Fast Rental repo applies migrations `0001`–`0005` (and later `0006` at cutover).

## Shared project

- URL: `https://twkqsaupojldddclgpqj.supabase.co`
- Tables used: `logements`, `demandes_clients`, `agents`, `listing_media`, `geocode_cache`
- View: `public_available_listings` (see [`db/sql/union_rental_views.sql`](../db/sql/union_rental_views.sql))

## Bootstrap SQL (Union Rental repo only)

| File | When to run |
|------|-------------|
| [`db/sql/0000_fast_rental_dependencies.sql`](../db/sql/0000_fast_rental_dependencies.sql) | Only if Phase 4 checks A/B/D fail — creates `listing_media`, `geocode_cache`, `listing_media_counts`, geocoding columns on `logements` |
| [`db/sql/union_rental_views.sql`](../db/sql/union_rental_views.sql) | Always — creates `public_available_listings` and revokes anon/authenticated |

Never run `supabase db push` from this repo. Never apply Fast Rental `0006_lockdown_legacy_policies.sql` until both new stacks are live.

## Verification queries

Run in Supabase SQL Editor before first deploy:

```sql
-- A. Required tables
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('logements','demandes_clients','agents','listing_media','geocode_cache');

-- B. Fast Rental view (or created by 0000)
select table_name from information_schema.views
where table_schema = 'public' and table_name in ('listing_media_counts','public_available_listings');

-- C. Lead columns
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'demandes_clients'
  and column_name in ('logement_id','dossier_tal','ref_agent_id');

-- D. Geocoding columns on logements
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'logements'
  and column_name in ('latitude','longitude','deleted_at','geocoding_status');
```

Automated live check: `npm run verify-db`

## Lead insert compatibility

Union Rental inserts into `demandes_clients` with columns:

- `type_demande`, `logement_id`, `ref_agent_id`, `nom`, `telephone`, `email`
- `revenu_mensuel`, `dossier_tal`, `date_demenagement`, `message`

DB defaults handle `statut`, `lu`, `created_at`.

## Cutover coordination

Do **not** apply Fast Rental `0006_lockdown_legacy_policies.sql` until both new apps are live and the legacy Union Rental site is redirected.
