import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let lastNominatimCall = 0;

function normalizeAddress(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function waitNominatimRateLimit() {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastNominatimCall = Date.now();
}

export async function geocodeAddress(
  adresse: string,
  quartier: string | null,
): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = normalizeAddress(`${adresse} ${quartier ?? ''}`);
  const { data: cached } = await supabaseAdmin
    .from('geocode_cache')
    .select('latitude,longitude')
    .eq('normalized_address', normalized)
    .maybeSingle();

  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }

  await waitNominatimRateLimit();
  const q = encodeURIComponent(`${adresse}, ${quartier ?? ''}, Québec, Canada`);
  const url = `${env.GEOCODING_BASE_URL}?format=json&limit=1&countrycodes=ca&q=${q}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': env.GEOCODING_USER_AGENT },
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'Nominatim request failed');
    return null;
  }

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!results.length) return null;

  const latitude = parseFloat(results[0]!.lat);
  const longitude = parseFloat(results[0]!.lon);

  await supabaseAdmin.from('geocode_cache').upsert({
    normalized_address: normalized,
    latitude,
    longitude,
    provider: 'nominatim',
    raw_response: results[0],
  });

  return { latitude, longitude };
}

export async function runGeocodeBackfill(limit?: number) {
  const batchSize = limit ?? env.GEOCODE_BACKFILL_BATCH_SIZE;
  const { data: rows, error } = await supabaseAdmin
    .from('logements')
    .select('id,adresse,quartier')
    .is('latitude', null)
    .is('deleted_at', null)
    .or('geocoding_status.is.null,geocoding_status.eq.pending')
    .limit(batchSize);

  if (error) throw error;

  let geocoded = 0;
  let failed = 0;
  let cached = 0;

  for (const row of rows ?? []) {
    try {
      const normalized = normalizeAddress(`${row.adresse} ${row.quartier ?? ''}`);
      const { data: existingCache } = await supabaseAdmin
        .from('geocode_cache')
        .select('latitude,longitude')
        .eq('normalized_address', normalized)
        .maybeSingle();

      let coords: { latitude: number; longitude: number } | null = null;
      if (existingCache) {
        coords = { latitude: existingCache.latitude, longitude: existingCache.longitude };
        cached++;
      } else {
        coords = await geocodeAddress(row.adresse, row.quartier);
      }

      if (coords) {
        await supabaseAdmin
          .from('logements')
          .update({
            latitude: coords.latitude,
            longitude: coords.longitude,
            geocoded_at: new Date().toISOString(),
            geocoding_status: 'success',
            geocoding_error: null,
          })
          .eq('id', row.id);
        geocoded++;
      } else {
        await supabaseAdmin
          .from('logements')
          .update({
            geocoding_status: 'failed',
            geocoding_error: 'No result',
          })
          .eq('id', row.id);
        failed++;
      }
    } catch (err) {
      logger.error({ err, listingId: row.id }, 'Geocode row failed');
      failed++;
    }
  }

  const summary = { seen: rows?.length ?? 0, geocoded, failed, cached };
  logger.info(summary, 'Geocode backfill complete');
  return summary;
}
