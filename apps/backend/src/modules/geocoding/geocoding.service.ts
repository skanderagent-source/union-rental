import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { buildGeocodeQuery, normalizeGeocodeAddress } from './geocoding.helpers.js';

let lastNominatimCall = 0;
let rateLimitChain: Promise<void> = Promise.resolve();

async function waitNominatimRateLimit() {
  let release!: () => void;
  const slot = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = rateLimitChain;
  rateLimitChain = slot;
  await previous;

  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastNominatimCall = Date.now();
  release();
}

export async function geocodeAddress(listing: {
  adresse: string;
  quartier: string | null;
  ville: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const query = buildGeocodeQuery(listing);
  const normalized = normalizeGeocodeAddress(query);

  const { data: cached } = await supabaseAdmin
    .from('geocode_cache')
    .select('latitude,longitude')
    .eq('normalized_address', normalized)
    .maybeSingle();

  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }

  await waitNominatimRateLimit();

  const url = new URL(env.GEOCODING_BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'ca');

  const res = await fetch(url, {
    headers: {
      'User-Agent': env.GEOCODING_USER_AGENT,
      'Accept-Language': 'fr',
    },
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
    provider: env.GEOCODING_PROVIDER,
    raw_response: results[0],
  });

  return { latitude, longitude };
}

/** Optional fallback when Fast Rental geocoding has not run yet. Prefer Fast Rental `npm run geocode`. */
export async function runGeocodeBackfill(limit?: number) {
  const batchSize = limit ?? env.GEOCODE_BACKFILL_BATCH_SIZE;
  const { data: rows, error } = await supabaseAdmin
    .from('logements')
    .select('id,adresse,quartier,ville')
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
      const query = buildGeocodeQuery(row);
      const normalized = normalizeGeocodeAddress(query);
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
        coords = await geocodeAddress(row);
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
