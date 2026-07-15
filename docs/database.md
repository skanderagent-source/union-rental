# Database

Union Rental **does not own** the Supabase schema. Fast Rental applies the canonical migrations
(`0001`–`0012`); `0006` remains a cutover-only migration.

## Shared project

- URL: `https://twkqsaupojldddclgpqj.supabase.co`
- Tables used: `logements`, `demandes_clients`, `agents`, `listing_media`
- Views: `listing_media_counts` (Fast Rental) and `public_available_listings`
  (see [`db/sql/union_rental_views.sql`](../db/sql/union_rental_views.sql))

## Bootstrap SQL (Union Rental repo only)

| File | When to run |
|------|-------------|
| [`db/sql/0000_fast_rental_dependencies.sql`](../db/sql/0000_fast_rental_dependencies.sql) | Emergency fallback only — creates the public read-model dependencies, including `listing_media.sort_order` and `listing_media_counts` |
| [`db/sql/union_rental_views.sql`](../db/sql/union_rental_views.sql) | Emergency fallback only — matches Fast migration `0011`, which creates `public_available_listings`, hides historic Orcha rows, and revokes anon/authenticated |

Never run `supabase db push` from this repo. Never apply Fast Rental `0006_lockdown_legacy_policies.sql` until both new stacks are live.

## Read/write boundary

- Customers have no direct Supabase access and can only use the public listing API and callback form.
- Union's backend inserts callback leads into `demandes_clients`; it does not update listings, media, or geocoding data.
- Fast Rental admin reads active demandes at `/app/demandes` (`statut = 'nouveau'`).
- The `message` column includes type, income, credit score, TAL, and move-in date so the Fast Rental Demandes panel shows the full form (that UI only renders `message` beyond contact fields).
- Column values (`revenu_mensuel`, `score_credit`, `date_demenagement`, `listing_id`) are also stored for assignment emails and reporting.
- Fast Rental owns listing imports, availability, media ordering, approvals, and geocoding.

## Verification queries

Run in Supabase SQL Editor before first deploy:

```sql
-- A. Required tables
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('logements','demandes_clients','agents','listing_media');

-- B. Fast Rental view (or created by 0000)
select table_name from information_schema.views
where table_schema = 'public' and table_name in ('listing_media_counts','public_available_listings');

-- C. Lead columns (Fast Rental schema)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'demandes_clients'
  and column_name in ('listing_id','ref_agent_id');

-- D. Fast Rental media-ordering contract
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'listing_media'
  and column_name = 'sort_order';
```

Automated live check: `npm run verify-db`

## Lead insert compatibility

Union Rental inserts into `demandes_clients` with columns aligned to Fast Rental:

- `type_demande`, `listing_id`, `logement_id` (legacy), `ref_agent_id`, `nom`, `telephone`, `email`
- `revenu_mensuel`, `score_credit`, `date_demenagement`, `message`

Prequal **dossier TAL** is stored in `message` (`Dossier TAL: Oui/Non`) because the shared schema has no `dossier_tal` column.

DB defaults handle `statut`, `lu`, `created_at`.

## Fast Rental rollout coordination

Before deploying Union code that reads ordered media:

1. Apply Fast Rental migrations `0008_listing_media_sort_order.sql` through
   `0012_demandes_clients_listing_id.sql`. Migration `0011` creates the public
   inventory view and `0012` provides the callback-lead `listing_id` contract.
2. Run `npm run verify-db`.

For cross-app local media testing, Union auto-detects Fast Rental's local storage folder
in development. For production-like testing, both backends must use the same R2 bucket.

## Cutover coordination

Do **not** apply Fast Rental `0006_lockdown_legacy_policies.sql` until both new apps are live and the legacy Union Rental site is redirected.
