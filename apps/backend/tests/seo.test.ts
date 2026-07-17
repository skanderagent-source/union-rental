import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  buildCanonicalUrl,
  formatSitemapLastmod,
  isProductionSiteUrl,
  renderSitemapUrlset,
  splitSitemapEntries,
} from '@union-rental/shared';
import { supabaseAdmin } from '../src/db/supabaseAdmin.js';
import { app } from '../src/app.js';
import { buildRobotsTxt } from '../src/modules/seo/seo.service.js';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

const listingId = '11111111-1111-4111-8111-111111111111';

function mockSitemapData() {
  vi.mocked(supabaseAdmin.from).mockImplementation(
    mockSupabaseFrom({
      public_available_listings: () =>
        createThenableChain({
          data: [{ id: listingId }],
        }),
      listing_media: () =>
        createThenableChain({
          data: [
            {
              listing_id: listingId,
              approved_at: '2026-07-10T12:00:00.000Z',
              upload_completed_at: '2026-07-09T12:00:00.000Z',
              created_at: '2026-07-01T12:00:00.000Z',
            },
          ],
        }),
    }),
  );
}

describe('shared SEO utilities', () => {
  it('builds canonical URLs with lowercase host and no trailing slash', () => {
    expect(buildCanonicalUrl('https://WWW.LogiGo.ca/', '/inventaire/')).toBe(
      'https://www.logigo.ca/inventaire',
    );
    expect(buildCanonicalUrl('https://logigo.ca', '/')).toBe('https://logigo.ca/');
  });

  it('detects non-production hostnames', () => {
    expect(isProductionSiteUrl('https://logigo.ca')).toBe(true);
    expect(isProductionSiteUrl('https://union-rental.vercel.app')).toBe(false);
    expect(isProductionSiteUrl('https://staging.logigo.ca')).toBe(false);
    expect(isProductionSiteUrl('http://localhost:5174')).toBe(false);
  });

  it('formats sitemap lastmod as W3C date', () => {
    expect(formatSitemapLastmod(new Date('2026-07-17T15:30:00.000Z'))).toBe('2026-07-17');
  });

  it('splits sitemaps when URL count exceeds the limit', () => {
    const entries = Array.from({ length: 3 }, (_, index) => ({
      loc: `https://logigo.ca/logement/${index}`,
    }));
    const chunks = splitSitemapEntries(entries, 2, 50_000_000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
    expect(renderSitemapUrlset(chunks[0])).toContain('<loc>https://logigo.ca/logement/0</loc>');
  });
});

describe('SEO routes', () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
    mockSitemapData();
  });

  it('serves robots.txt with a sitemap reference or disallow-all in non-production', () => {
    const body = buildRobotsTxt();
    if (process.env.NODE_ENV === 'production') {
      expect(body).toMatch(/Sitemap:/);
    } else {
      expect(body).toContain('Disallow: /');
    }
  });

  it('returns XML for /seo/sitemap.xml', async () => {
    const res = await request(app).get('/seo/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toContain('<urlset');
    expect(res.text).toContain('/inventaire');
    expect(res.text).toContain('/en/inventaire');
    expect(res.text).toContain(`/logement/${listingId}`);
    expect(res.text).toContain(`/en/logement/${listingId}`);
    expect(res.text).toContain('<lastmod>2026-07-10</lastmod>');
    expect(res.text).not.toContain('/r/');
    expect(res.text).not.toMatch(/https?:\/\/[^\s<]+\?/);
  });

  it('returns 404 for missing sitemap parts when only one chunk exists', async () => {
    const res = await request(app).get('/seo/sitemap-999.xml');
    expect(res.status).toBe(404);
  });

  it('returns listing availability status codes', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        public_available_listings: () =>
          createThenableChain({ data: null, error: null }),
        logements: () =>
          createThenableChain({
            data: { id: listingId, deleted_at: '2026-01-01T00:00:00.000Z', statut: 'Available' },
          }),
      }),
    );

    const gone = await request(app).get(`/seo/listing/${listingId}/status`);
    expect(gone.status).toBe(410);
    expect(gone.body.data.status).toBe('gone');
  });
});
