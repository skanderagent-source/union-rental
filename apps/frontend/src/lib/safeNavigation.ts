import {
  isValidListingId,
  isValidReferralUsername,
  localizedInternalPath,
  normalizeReferralUsername,
  type AppLocale,
} from '@union-rental/shared';

/** Allow only same-origin relative paths — blocks open redirects via //evil.com. */
export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(path);
    if (decoded.includes('://') || decoded.startsWith('//')) return false;
  } catch {
    return false;
  }

  return true;
}

/** Strip dangerous fragments from location.hash before navigation. */
export function sanitizeRouteHash(hash: string): string {
  if (!hash.startsWith('#')) return '';
  if (hash.length > 256) return hash.slice(0, 256);
  const lower = hash.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('://')) return '';
  return hash;
}

export function buildListingPath(listingId: string, locale: AppLocale = 'fr'): string | null {
  if (!isValidListingId(listingId)) return null;
  return localizedInternalPath(locale, `/logement/${listingId}`);
}

export function buildInventoryReferralPath(
  slug: string,
  listingId?: string | null,
): string | null {
  const normalized = normalizeReferralUsername(slug);
  if (!isValidReferralUsername(normalized)) return null;
  const base = `/inventaire/${encodeURIComponent(normalized)}`;
  if (listingId && isValidListingId(listingId)) {
    return `${base}?listing=${listingId}`;
  }
  return base;
}
