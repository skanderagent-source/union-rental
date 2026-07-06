import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

config({ path: resolve('apps/backend/.env') });

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]!, 10) : parseInt(process.env.GEOCODE_BACKFILL_BATCH_SIZE ?? '50', 10);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userAgent = process.env.GEOCODING_USER_AGENT;
const baseUrl = process.env.GEOCODING_BASE_URL;

if (!url || !key || !userAgent || !baseUrl) {
  console.error('Missing Supabase or geocoding env vars in apps/backend/.env');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function normalizeAddress(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

let lastCall = 0;
async function waitRate() {
  const elapsed = Date.now() - lastCall;
  if (elapsed < 1100) await new Promise((r) => setTimeout(r, 1100 - elapsed));
  lastCall = Date.now();
}

const { data: rows, error } = await sb
  .from('logements')
  .select('id,adresse,quartier')
  .is('latitude', null)
  .is('deleted_at', null)
  .or('geocoding_status.is.null,geocoding_status.eq.pending')
  .limit(limit);

if (error) {
  console.error(error);
  process.exit(1);
}

let geocoded = 0;
let failed = 0;

for (const row of rows ?? []) {
  const normalized = normalizeAddress(`${row.adresse} ${row.quartier ?? ''}`);
  const { data: cached } = await sb
    .from('geocode_cache')
    .select('latitude,longitude')
    .eq('normalized_address', normalized)
    .maybeSingle();

  let lat;
  let lon;

  if (cached) {
    lat = cached.latitude;
    lon = cached.longitude;
  } else {
    await waitRate();
    const q = encodeURIComponent(`${row.adresse}, ${row.quartier ?? ''}, Québec, Canada`);
    const res = await fetch(`${baseUrl}?format=json&limit=1&countrycodes=ca&q=${q}`, {
      headers: { 'User-Agent': userAgent },
    });
    const results = await res.json();
    if (!results?.length) {
      await sb.from('logements').update({ geocoding_status: 'failed', geocoding_error: 'No result' }).eq('id', row.id);
      failed++;
      continue;
    }
    lat = parseFloat(results[0].lat);
    lon = parseFloat(results[0].lon);
    await sb.from('geocode_cache').upsert({
      normalized_address: normalized,
      latitude: lat,
      longitude: lon,
      provider: 'nominatim',
      raw_response: results[0],
    });
  }

  await sb
    .from('logements')
    .update({
      latitude: lat,
      longitude: lon,
      geocoded_at: new Date().toISOString(),
      geocoding_status: 'success',
      geocoding_error: null,
    })
    .eq('id', row.id);
  geocoded++;
}

console.log({ seen: rows?.length ?? 0, geocoded, failed });
