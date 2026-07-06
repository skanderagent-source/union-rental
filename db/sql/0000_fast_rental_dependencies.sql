-- Union Rental dependency bootstrap. Run ONLY if Phase 4 checks A/B/D fail.
-- Fast Rental's full 0001 migration is richer; this subset is enough for the public site.

alter table logements add column if not exists deleted_at timestamptz null;
alter table logements add column if not exists latitude double precision null;
alter table logements add column if not exists longitude double precision null;
alter table logements add column if not exists geocoded_at timestamptz null;
alter table logements add column if not exists geocoding_status text null
  check (geocoding_status in ('pending','success','failed','manual'));
alter table logements add column if not exists geocoding_error text null;

create index if not exists logements_deleted_at_idx on logements(deleted_at);

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
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists listing_media_listing_id_idx on listing_media(listing_id);
create index if not exists listing_media_status_idx on listing_media(status);
create index if not exists listing_media_listing_status_type_idx
  on listing_media(listing_id, status, type);

create table if not exists geocode_cache (
  normalized_address text primary key,
  latitude double precision not null,
  longitude double precision not null,
  provider text not null,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view listing_media_counts as
select
  l.id as listing_id,
  count(m.id) filter (where m.status = 'approved') as approved_media_count,
  count(m.id) filter (where m.status = 'approved' and m.type = 'image') as approved_image_count,
  count(m.id) filter (where m.status = 'pending') as pending_media_count
from logements l
left join listing_media m on m.listing_id = l.id
where l.deleted_at is null
group by l.id;
