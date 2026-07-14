-- Union Rental dependency bootstrap. Run ONLY if schema verification fails.
-- Fast Rental owns the canonical schema; this is the minimum public read-model subset.

alter table logements add column if not exists deleted_at timestamptz null;
alter table logements add column if not exists latitude double precision null;
alter table logements add column if not exists longitude double precision null;

create index if not exists logements_deleted_at_idx on logements(deleted_at);

-- Legacy Fast Rental databases used logement_id for callback lead association.
-- Keep it for compatibility while exposing the canonical listing_id column.
alter table demandes_clients add column if not exists listing_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'demandes_clients_listing_id_fkey'
  ) then
    alter table demandes_clients
      add constraint demandes_clients_listing_id_fkey
      foreign key (listing_id) references logements(id) on delete set null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demandes_clients'
      and column_name = 'logement_id'
  ) then
    execute '
      update demandes_clients as demand
      set listing_id = demand.logement_id
      from logements as listing
      where demand.listing_id is null
        and demand.logement_id = listing.id
    ';
  end if;
end
$$;

create index if not exists demandes_clients_listing_id_idx
  on demandes_clients(listing_id);

create table if not exists listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references logements(id) on delete cascade,
  uploaded_by uuid not null references agents(id),
  approved_by uuid null references agents(id),
  type text not null check (type in ('image','video')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  bucket text not null,
  object_key text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer null,
  height integer null,
  duration_seconds numeric null,
  rejection_reason text null,
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  upload_completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

-- Match Fast Rental migration 0008 without overwriting an existing agent-defined order.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listing_media'
      and column_name = 'sort_order'
  ) then
    alter table listing_media add column sort_order integer not null default 0;

    with ranked as (
      select
        id,
        row_number() over (partition by listing_id order by created_at asc) - 1 as new_order
      from listing_media
    )
    update listing_media m
    set sort_order = ranked.new_order
    from ranked
    where m.id = ranked.id;
  end if;
end $$;

create index if not exists listing_media_listing_id_idx on listing_media(listing_id);
create index if not exists listing_media_status_idx on listing_media(status);
create index if not exists listing_media_listing_status_type_idx
  on listing_media(listing_id, status, type);
create index if not exists listing_media_listing_sort_idx on listing_media(listing_id, sort_order);

create or replace view public.listing_media_counts
with (security_invoker = true)
as
select
  l.id as listing_id,
  count(m.id) filter (where m.status = 'approved') as approved_media_count,
  count(m.id) filter (where m.status = 'approved' and m.type = 'image') as approved_image_count,
  count(m.id) filter (where m.status = 'pending') as pending_media_count
from logements l
left join listing_media m on m.listing_id = l.id
where l.deleted_at is null
group by l.id;
