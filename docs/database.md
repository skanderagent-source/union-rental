# Database

Union Rental **does not own** the Supabase schema. The Fast Rental repo applies migrations `0001`–`0005` (and later `0006` at cutover).

## Shared project

- URL: `https://twkqsaupojldddclgpqj.supabase.co`
- Tables used: `logements`, `demandes_clients`, `agents`, `listing_media`, `geocode_cache`
- View: `public_available_listings` (see [`db/sql/union_rental_views.sql`](../db/sql/union_rental_views.sql))

## Verification queries

Run in Supabase SQL Editor before first deploy:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('logements','demandes_clients','agents','listing_media','geocode_cache');

select table_name from information_schema.views
where table_schema = 'public' and table_name = 'public_available_listings';
```

## Lead insert compatibility

Union Rental inserts into `demandes_clients` with columns:

- `type_demande`, `logement_id`, `ref_agent_id`, `nom`, `telephone`, `email`
- `revenu_mensuel`, `dossier_tal`, `date_demenagement`, `message`

DB defaults handle `statut`, `lu`, `created_at`.

## Cutover coordination

Do **not** apply Fast Rental `0006_lockdown_legacy_policies.sql` until both new apps are live and the legacy Union Rental site is redirected.
