import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

import { supabaseAdmin } from '../src/db/supabaseAdmin.js';
import { geocodeAddress, runGeocodeBackfill } from '../src/modules/geocoding/geocoding.service.js';

describe('geocoding.service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  it('uses cache hit without calling Nominatim', async () => {
    const cacheChain = createThenableChain({ data: null, error: null });
    cacheChain.maybeSingle = vi.fn(async () => ({
      data: { latitude: 45.5, longitude: -73.5 },
      error: null,
    }));

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        geocode_cache: () => cacheChain,
      }),
    );

    const result = await geocodeAddress('123 Rue Test', 'Plateau');
    expect(result).toEqual({ latitude: 45.5, longitude: -73.5 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes cache and returns coordinates on Nominatim miss', async () => {
    const cacheMissChain = createThenableChain({ data: null, error: null });
    cacheMissChain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const upsertChain = createThenableChain({ data: null, error: null });
    upsertChain.upsert = upsert;

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        geocode_cache: () => {
          const calls = vi.mocked(supabaseAdmin.from).mock.calls.length;
          return calls <= 1 ? cacheMissChain : upsertChain;
        },
      }),
    );

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '45.5017', lon: '-73.5673' }],
    });

    const result = await geocodeAddress('999 Rue Nouvelle', 'Rosemont');
    expect(result).toEqual({ latitude: 45.5017, longitude: -73.5673 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalled();
  });

  it('marks geocoding_status failed when Nominatim returns no results during backfill', async () => {
    const row = { id: 'listing-1', adresse: '404 Rue Inconnue', quartier: 'Test' };
    const listingsChain = createThenableChain({ data: [row], error: null });
    const cacheChain = createThenableChain({ data: null, error: null });
    cacheChain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const update = vi.fn().mockReturnThis();
    const updateChain = createThenableChain({ data: null, error: null });
    updateChain.update = update;
    updateChain.eq = vi.fn(() => updateChain);

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        logements: () => listingsChain,
        geocode_cache: () => cacheChain,
      }),
    );

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'logements') {
        const chain = createThenableChain({ data: [row], error: null });
        chain.select = vi.fn(() => chain);
        chain.is = vi.fn(() => chain);
        chain.or = vi.fn(() => chain);
        chain.limit = vi.fn(() => chain);
        chain.update = update;
        chain.eq = vi.fn(() => updateChain);
        return chain;
      }
      if (table === 'geocode_cache') return cacheChain;
      return createThenableChain({ data: null, error: null });
    });

    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const summary = await runGeocodeBackfill(1);
    expect(summary.failed).toBe(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ geocoding_status: 'failed' }),
    );
  });

  it('does not re-select failed or manual rows in backfill query', async () => {
    const chain = createThenableChain({ data: [], error: null });
    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        logements: () => chain,
      }),
    );

    await runGeocodeBackfill(5);
    expect(chain.or).toHaveBeenCalledWith('geocoding_status.is.null,geocoding_status.eq.pending');
  });
});
