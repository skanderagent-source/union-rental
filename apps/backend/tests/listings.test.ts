import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { MAP_RESULT_CAP, PUBLIC_LISTING_FIELDS } from '@union-rental/shared';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock('../src/modules/media/mediaUrl.service.js', () => ({
  resolveViewUrl: vi.fn().mockResolvedValue('https://signed.example/view'),
  resolveDownloadUrl: vi.fn().mockResolvedValue('https://signed.example/dl'),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) },
  })),
}));

import { app } from '../src/app.js';
import { supabaseAdmin } from '../src/db/supabaseAdmin.js';
import { resolveViewUrl } from '../src/modules/media/mediaUrl.service.js';
import { sanitizeSearchTerm } from '../src/utils/sanitize.js';

const sampleRows = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    adresse: '123 Rue A',
    quartier: 'Plateau',
    prix: 1200,
    taille: '4.5',
    electromenagers: 'Inclus',
    notes: 'Note A',
    statut: 'Available',
    source: 'manual',
    latitude: 45.5,
    longitude: -73.5,
    approved_image_count: 2,
    approved_media_count: 2,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    adresse: '456 Rue B',
    quartier: 'Rosemont',
    prix: null,
    taille: '3.5',
    electromenagers: null,
    notes: null,
    statut: 'Available',
    source: null,
    latitude: null,
    longitude: null,
    approved_image_count: 0,
    approved_media_count: 0,
  },
];

describe('GET /api/public/listings', () => {
  let listChain: ReturnType<typeof createThenableChain>;
  let mediaChain: ReturnType<typeof createThenableChain>;

  beforeEach(() => {
    vi.mocked(resolveViewUrl).mockClear();
    listChain = createThenableChain({ data: sampleRows, error: null, count: 2 });

    mediaChain = createThenableChain({
      data: [
        {
          id: 'media-1',
          listing_id: sampleRows[0]!.id,
          object_key: 'photos/a.jpg',
          original_filename: 'a.jpg',
        },
      ],
      error: null,
    });

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () => listChain,
        listing_media: () => mediaChain,
      }),
    );
  });

  it('queries public_available_listings with photos-first ordering before pagination', async () => {
    const res = await request(app).get('/api/public/listings?page=1&pageSize=24');
    expect(res.status).toBe(200);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('public_available_listings');
    const chain = vi.mocked(supabaseAdmin.from).mock.results[0]?.value;
    expect(chain.order).toHaveBeenNthCalledWith(1, 'approved_image_count', { ascending: false });
    expect(chain.order).toHaveBeenNthCalledWith(2, 'adresse', { ascending: true });
    expect(chain.range).toHaveBeenCalledWith(0, 23);
  });

  it('only signs thumbnails for completed approved uploads', async () => {
    await request(app).get('/api/public/listings');
    expect(mediaChain.not).toHaveBeenCalledWith('upload_completed_at', 'is', null);
    expect(mediaChain.order).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true });
    expect(mediaChain.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: true });
  });

  it('sanitizes search terms before building the or filter', async () => {
    const raw = 'foo,()%bar';
    await request(app).get(`/api/public/listings?q=${encodeURIComponent(raw)}`);
    const orArg = listChain.or.mock.calls.at(-1)?.[0] as string;
    expect(orArg).toContain(sanitizeSearchTerm(raw));
    expect(orArg).not.toContain('()%');
  });

  it('returns public fields with thumbnailUrl and null when no approved images', async () => {
    const res = await request(app).get('/api/public/listings');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    for (const field of PUBLIC_LISTING_FIELDS) {
      expect(res.body.data.items[0]).toHaveProperty(field === 'id' ? 'id' : field);
    }
    expect(res.body.data.items[0].thumbnailUrl).toBe('https://signed.example/view');
    expect(res.body.data.items[1].thumbnailUrl).toBeNull();
    expect(res.body.data.items[0]).toHaveProperty('approvedImageCount');
  });

  it('applies prixMax with null-priced rows retained', async () => {
    await request(app).get('/api/public/listings?prixMax=1500');
    expect(listChain.or).toHaveBeenCalledWith('prix.is.null,prix.lte.1500');
  });
});

describe('GET /api/public/listings/:id', () => {
  beforeEach(() => {
    vi.mocked(resolveViewUrl).mockClear();
  });

  it('returns 404 LISTING_NOT_AVAILABLE for missing listing', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () =>
          createThenableChain({ data: null, error: null }).maybeSingle as never,
      }),
    );
    const detailChain = createThenableChain({ data: null, error: null });
    detailChain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () => detailChain,
      }),
    );

    const res = await request(app).get('/api/public/listings/missing-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LISTING_NOT_AVAILABLE');
  });

  it('returns approved media ordered by Fast Rental sort order', async () => {
    const detailChain = createThenableChain({ data: sampleRows[0], error: null });
    detailChain.maybeSingle = vi.fn(async () => ({ data: sampleRows[0], error: null }));
    const mediaChain = createThenableChain({
      data: [
        {
          id: 'media-2',
          type: 'video',
          object_key: 'videos/a.mp4',
          original_filename: 'a.mp4',
          sort_order: 0,
          created_at: '2026-01-02',
        },
        {
          id: 'media-1',
          type: 'image',
          object_key: 'photos/a.jpg',
          original_filename: 'a.jpg',
          sort_order: 1,
          created_at: '2026-01-01',
        },
      ],
      error: null,
    });

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () => detailChain,
        listing_media: () => mediaChain,
      }),
    );

    const res = await request(app).get(`/api/public/listings/${sampleRows[0]!.id}`);
    expect(res.status).toBe(200);
    expect(mediaChain.not).toHaveBeenCalledWith('upload_completed_at', 'is', null);
    expect(mediaChain.order).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true });
    expect(mediaChain.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: true });
    expect(res.body.data.media).toHaveLength(2);
    expect(res.body.data.media.map((m: { id: string }) => m.id)).toEqual(['media-2', 'media-1']);
    expect(res.body.data.media.every((m: { viewUrl: string }) => m.viewUrl.startsWith('https://'))).toBe(
      true,
    );
  });
});

describe('GET /api/public/listings/map', () => {
  it('returns minimal map fields with cap applied', async () => {
    const mapRow = {
      id: sampleRows[0]!.id,
      adresse: sampleRows[0]!.adresse,
      quartier: sampleRows[0]!.quartier,
      prix: sampleRows[0]!.prix,
      latitude: sampleRows[0]!.latitude,
      longitude: sampleRows[0]!.longitude,
    };
    const mapChain = createThenableChain({ data: [mapRow], error: null });
    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () => mapChain,
      }),
    );

    const res = await request(app).get('/api/public/listings/map');
    expect(res.status).toBe(200);
    expect(mapChain.limit).toHaveBeenCalledWith(MAP_RESULT_CAP);
    expect(res.body.data[0]).toEqual(mapRow);
  });
});
