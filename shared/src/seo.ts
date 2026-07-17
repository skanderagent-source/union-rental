/** Canonical static routes included in the XML sitemap. */
export const SEO_STATIC_PATHS = ['/', '/inventaire', '/a-propos'] as const;

/** Stable Open Graph / structured-data image (copied to /public at build). */
export const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';

/** Build-time OG images per indexable page template (38). */
export const OG_IMAGE_BY_TEMPLATE = {
  home: '/og-default.jpg',
  inventory: '/og-inventory.jpg',
  about: '/og-about.jpg',
} as const;

export type OgImageTemplate = keyof typeof OG_IMAGE_BY_TEMPLATE;

export type SeoStaticPath = (typeof SEO_STATIC_PATHS)[number];

/** Sitemap protocol limits (Google / sitemaps.org). */
export const SITEMAP_MAX_URLS = 50_000;
export const SITEMAP_MAX_BYTES = 50 * 1024 * 1024;

export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

const NON_PRODUCTION_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^\[::1\]$/,
  /\.vercel\.app$/i,
  /(^|[.-])staging([.-]|$)/i,
  /(^|[.-])preview([.-]|$)/i,
  /(^|[.-])test([.-]|$)/i,
];

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
};

export function normalizeSiteOrigin(siteUrl: string): string {
  const parsed = new URL(siteUrl);
  const hostname = parsed.hostname.toLowerCase();
  const defaultPort =
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80');
  const port = parsed.port && !defaultPort ? `:${parsed.port}` : '';
  return `${parsed.protocol}//${hostname}${port}`;
}

/** Build a canonical absolute URL (no query/hash, no trailing slash except root). */
export function buildCanonicalUrl(siteUrl: string, pathname: string): string {
  const origin = normalizeSiteOrigin(siteUrl);
  let path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `${origin}${path}`;
}

export function buildListingPath(listingId: string): string {
  return `/logement/${listingId}`;
}

export function formatSitemapLastmod(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid sitemap lastmod date');
  }
  return date.toISOString().slice(0, 10);
}

export function isProductionSiteHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return !NON_PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export function isProductionSiteUrl(siteUrl: string): boolean {
  try {
    return isProductionSiteHostname(new URL(siteUrl).hostname);
  } catch {
    return false;
  }
}

export function truncateSeoText(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 1) return '…';
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemapUrlset(entries: readonly SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : '';
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderSitemapIndex(
  entries: readonly { loc: string; lastmod?: string }[],
): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : '';
      return `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function splitSitemapEntries(
  entries: readonly SitemapUrlEntry[],
  maxUrls = SITEMAP_MAX_URLS,
  maxBytes = SITEMAP_MAX_BYTES,
): SitemapUrlEntry[][] {
  if (!entries.length) return [[]];

  const byteLength = (value: string) => new TextEncoder().encode(value).length;

  const chunks: SitemapUrlEntry[][] = [];
  let current: SitemapUrlEntry[] = [];

  for (const entry of entries) {
    const next = [...current, entry];
    const nextBytes = byteLength(renderSitemapUrlset(next));
    if (current.length >= maxUrls || (current.length > 0 && nextBytes > maxBytes)) {
      chunks.push(current);
      current = [entry];
      const singleBytes = byteLength(renderSitemapUrlset(current));
      if (singleBytes > maxBytes) {
        throw new Error('Single sitemap URL exceeds maximum uncompressed size');
      }
      continue;
    }
    current = next;
  }

  if (current.length) chunks.push(current);
  return chunks.length ? chunks : [[]];
}
