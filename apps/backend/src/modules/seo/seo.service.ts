import {
  SEO_STATIC_PATHS,
  buildCanonicalUrl,
  buildListingPath,
  formatSitemapLastmod,
  isProductionSiteUrl,
  localizedInternalPath,
  renderSitemapIndex,
  renderSitemapUrlset,
  splitSitemapEntries,
  SUPPORTED_LOCALES,
  type SitemapUrlEntry,
  assertSitemapLocPathname,
} from '@union-rental/shared';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { throwIfDatabaseError } from '../../utils/databaseError.js';

function primaryFrontendOrigin(): string {
  return env.FRONTEND_ORIGIN.split(',')[0]?.trim() ?? '';
}

export function isSeoIndexingAllowed(): boolean {
  const override = process.env.SEO_ALLOW_INDEXING?.trim().toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  if (env.NODE_ENV !== 'production') return false;
  return isProductionSiteUrl(primaryFrontendOrigin());
}

function siteOrigin(): string {
  return primaryFrontendOrigin();
}

function canonicalPath(pathname: string): string {
  return buildCanonicalUrl(siteOrigin(), pathname);
}

async function listListingLastmods(): Promise<Map<string, string>> {
  const { data: listings, error: listingsError } = await supabaseAdmin
    .from('public_available_listings')
    .select('id');
  throwIfDatabaseError(listingsError);

  const ids = (listings ?? []).map((row) => row.id as string);
  const lastmodByListing = new Map<string, string>();
  if (!ids.length) return lastmodByListing;

  const { data: mediaRows, error: mediaError } = await supabaseAdmin
    .from('listing_media')
    .select('listing_id, approved_at, upload_completed_at, created_at')
    .in('listing_id', ids)
    .eq('status', 'approved');
  throwIfDatabaseError(mediaError);

  for (const row of mediaRows ?? []) {
    const timestamps = [row.approved_at, row.upload_completed_at, row.created_at]
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .filter((value) => Number.isFinite(value));
    if (!timestamps.length) continue;

    const latest = new Date(Math.max(...timestamps));
    const listingId = row.listing_id as string;
    const formatted = formatSitemapLastmod(latest);
    const existing = lastmodByListing.get(listingId);
    if (!existing || formatted > existing) {
      lastmodByListing.set(listingId, formatted);
    }
  }

  return lastmodByListing;
}

export async function buildSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const origin = siteOrigin();
  const staticEntries: SitemapUrlEntry[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const path of SEO_STATIC_PATHS) {
      staticEntries.push({
        loc: buildCanonicalUrl(origin, localizedInternalPath(locale, path)),
      });
    }
  }

  const lastmodByListing = await listListingLastmods();
  const listingEntries: SitemapUrlEntry[] = [];
  for (const id of [...lastmodByListing.keys()].sort()) {
    const lastmod = lastmodByListing.get(id);
    for (const locale of SUPPORTED_LOCALES) {
      const entry: SitemapUrlEntry = {
        loc: buildCanonicalUrl(origin, localizedInternalPath(locale, buildListingPath(id))),
      };
      if (lastmod) entry.lastmod = lastmod;
      listingEntries.push(entry);
    }
  }

  return [...staticEntries, ...listingEntries].map((entry) => {
    const pathname = new URL(entry.loc).pathname;
    assertSitemapLocPathname(pathname);
    return entry;
  });
}

export type SitemapPayload =
  | { kind: 'urlset'; xml: string }
  | { kind: 'index'; xml: string };

export async function buildSitemapPayload(part?: number): Promise<SitemapPayload> {
  const entries = await buildSitemapEntries();
  const chunks = splitSitemapEntries(entries);
  const origin = siteOrigin();

  if (chunks.length === 1) {
    if (part && part !== 1) {
      throw new Error('Sitemap part not found');
    }
    return { kind: 'urlset', xml: renderSitemapUrlset(chunks[0] ?? []) };
  }

  if (!part) {
    const indexEntries = chunks.map((_chunk, index) => ({
      loc: buildCanonicalUrl(origin, `/sitemap-${index + 1}.xml`),
    }));
    return { kind: 'index', xml: renderSitemapIndex(indexEntries) };
  }

  const chunk = chunks[part - 1];
  if (!chunk) {
    throw new Error('Sitemap part not found');
  }
  return { kind: 'urlset', xml: renderSitemapUrlset(chunk) };
}

export function buildRobotsTxt(): string {
  const sitemapUrl = canonicalPath('/sitemap.xml');

  if (!isSeoIndexingAllowed()) {
    return ['User-agent: *', 'Disallow: /', ''].join('\n');
  }

  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');
}
