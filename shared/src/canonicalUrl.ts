import { isValidListingId, MAX_INVENTORY_PAGE } from './constants.js';

export const EN_PATH_PREFIX = '/en';
export type AppLocale = 'fr' | 'en';
export const DEFAULT_LOCALE: AppLocale = 'fr';

export const CANONICAL_ROUTES = {
  home: '/',
  inventory: '/inventaire',
  about: '/a-propos',
} as const;

export type AppRouteKind =
  | 'home'
  | 'inventory'
  | 'inventory_referral'
  | 'about'
  | 'listing'
  | 'legacy_referral'
  | 'unknown';

/** Query params stripped from all public URLs (tracking, referral capture, cache-busters). */
export const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  'ref',
  'listing',
]);

/** Allowed filter params on inventory pages only. */
export const INVENTORY_FILTER_PARAMS = new Set([
  'q',
  'quartier',
  'taille',
  'prixMax',
  'page',
  'vue',
]);

const LISTING_PATH =
  /^\/logement\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;
const REFERRAL_INVENTORY_PATH = /^\/inventaire\/([a-z0-9]{3,32})$/;
/** `/inventaire/<segment>` that is not a valid referral username (19, 26). */
const INVALID_REFERRAL_INVENTORY_PATH = /^\/inventaire\/[^/]+$/;
const LEGACY_REFERRAL_PATH = /^\/r\/([a-z0-9]{3,32})(?:\/logement\/([0-9a-f-]{36}))?$/;

export function normalizePathname(pathname: string): string {
  let path = pathname.trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path.toLowerCase();
}

/** Split `/en/inventaire` → `{ locale: 'en', pathname: '/inventaire' }`. */
export function splitLocalePath(pathname: string): { locale: AppLocale; pathname: string } {
  const path = normalizePathname(pathname);
  if (path === EN_PATH_PREFIX) {
    return { locale: 'en', pathname: '/' };
  }
  if (path.startsWith(`${EN_PATH_PREFIX}/`)) {
    const stripped = path.slice(EN_PATH_PREFIX.length) || '/';
    return { locale: 'en', pathname: stripped.startsWith('/') ? stripped : `/${stripped}` };
  }
  return { locale: DEFAULT_LOCALE, pathname: path };
}

export function withLocalePath(locale: AppLocale, pathname: string): string {
  const base = normalizePathname(pathname);
  if (locale === DEFAULT_LOCALE) return base;
  return base === '/' ? EN_PATH_PREFIX : `${EN_PATH_PREFIX}${base}`;
}

export function isDuplicatePathVariant(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === '/index.html' ||
    path.endsWith('.html') ||
    path.endsWith('.htm') ||
    path.endsWith('.php') ||
    path.endsWith('.aspx')
  );
}

export function classifyAppPath(pathname: string): AppRouteKind {
  const { pathname: path } = splitLocalePath(pathname);
  if (path === CANONICAL_ROUTES.home) return 'home';
  if (path === CANONICAL_ROUTES.inventory) return 'inventory';
  if (path === CANONICAL_ROUTES.about) return 'about';
  if (REFERRAL_INVENTORY_PATH.test(path)) return 'inventory_referral';
  if (LISTING_PATH.test(path)) return 'listing';
  if (LEGACY_REFERRAL_PATH.test(path)) return 'legacy_referral';
  return 'unknown';
}

export function extractListingId(pathname: string): string | null {
  const { pathname: path } = splitLocalePath(pathname);
  const match = path.match(LISTING_PATH);
  return match?.[1] ?? null;
}

/** Normalize inventory query params: allowlist, cap page, strip defaults (22–24, 26). */
export function normalizeInventoryQueryParams(params: URLSearchParams): URLSearchParams {
  const cleaned = new URLSearchParams();

  for (const key of INVENTORY_FILTER_PARAMS) {
    const value = params.get(key);
    if (value == null || value === '') continue;

    if (key === 'page') {
      const pageNum = Number.parseInt(value, 10);
      if (!Number.isFinite(pageNum) || pageNum < 1) continue;
      const capped = Math.min(pageNum, MAX_INVENTORY_PAGE);
      if (capped === 1) continue;
      cleaned.set('page', String(capped));
      continue;
    }

    if (key === 'vue') {
      if (value === 'carte') cleaned.set('vue', 'carte');
      continue;
    }

    cleaned.set(key, value);
  }

  return cleaned;
}

export function cleanQueryString(pathname: string, search: string): string {
  const kind = classifyAppPath(pathname);
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  let cleaned = new URLSearchParams();

  if (kind === 'inventory' || kind === 'inventory_referral') {
    cleaned = normalizeInventoryQueryParams(params);
    // Referral listing deep-links: keep ?listing= until InventoryPage captures the agent.
    if (kind === 'inventory_referral') {
      const listingId = params.get('listing');
      if (listingId && isValidListingId(listingId)) {
        cleaned.set('listing', listingId.toLowerCase());
      }
    }
  }

  const serialized = cleaned.toString();
  return serialized ? `?${serialized}` : '';
}

export type CanonicalRedirect = {
  pathname: string;
  search: string;
};

/**
 * Returns a single-hop canonical location when the current URL differs from the standard.
 * Returns null when no redirect is required.
 */
function resolveCanonicalRedirectForLocale(
  locale: AppLocale,
  pathname: string,
  search: string,
): CanonicalRedirect | null {
  const rawSearch = search.startsWith('?') ? search : search ? `?${search}` : '';
  const normalizedPath = normalizePathname(pathname);

  if (isDuplicatePathVariant(pathname)) {
    return { pathname: withLocalePath(locale, CANONICAL_ROUTES.home), search: '' };
  }

  const kind = classifyAppPath(normalizedPath);
  const cleanedSearch = cleanQueryString(normalizedPath, rawSearch);

  // Listing URLs are UUID-based (stable); legacy /r/:slug paths redirect in one hop (19).
  if (
    INVALID_REFERRAL_INVENTORY_PATH.test(normalizedPath) &&
    !REFERRAL_INVENTORY_PATH.test(normalizedPath)
  ) {
    return {
      pathname: withLocalePath(locale, CANONICAL_ROUTES.inventory),
      search: cleanedSearch,
    };
  }

  if (kind === 'legacy_referral') {
    const match = normalizedPath.match(LEGACY_REFERRAL_PATH);
    const slug = match?.[1];
    const listingId = match?.[2];
    if (slug && listingId && isValidListingId(listingId)) {
      return {
        pathname: withLocalePath(locale, `/logement/${listingId.toLowerCase()}`),
        search: '',
      };
    }
    if (slug) {
      return {
        pathname: withLocalePath(locale, CANONICAL_ROUTES.inventory),
        search: cleanedSearch,
      };
    }
  }

  if (kind === 'inventory_referral') {
    if (cleanedSearch !== rawSearch) {
      return { pathname: withLocalePath(locale, normalizedPath), search: cleanedSearch };
    }
    return null;
  }

  let targetPath = normalizedPath;
  if (kind === 'listing') {
    const listingId = extractListingId(normalizedPath);
    if (listingId) targetPath = `/logement/${listingId}`;
  }

  const localizedPath = withLocalePath(locale, targetPath);
  const localizedCurrent = withLocalePath(locale, normalizedPath);

  if (localizedPath !== localizedCurrent || cleanedSearch !== rawSearch) {
    return { pathname: localizedPath, search: cleanedSearch };
  }

  return null;
}

export function resolveCanonicalRedirect(
  pathname: string,
  search: string,
): CanonicalRedirect | null {
  const { locale, pathname: basePath } = splitLocalePath(pathname);
  return resolveCanonicalRedirectForLocale(locale, basePath, search);
}

export function isKnownAppPath(pathname: string): boolean {
  return classifyAppPath(pathname) !== 'unknown';
}

export function pathsEqual(a: string, b: string): boolean {
  return normalizePathname(a) === normalizePathname(b);
}

export function buildInternalPath(pathname: string, search = ''): string {
  const path = normalizePathname(pathname);
  const qs = cleanQueryString(path, search);
  return `${path}${qs}`;
}
