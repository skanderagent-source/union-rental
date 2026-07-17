import {
  CANONICAL_ROUTES,
  classifyAppPath,
  type AppRouteKind,
} from './canonicalUrl.js';
import {
  DEFAULT_PAGE_SIZE,
  MAX_INVENTORY_PAGE,
  MAX_LISTINGS_OFFSET,
  MIN_SEARCH_QUERY_LENGTH,
} from './constants.js';
import { staticCrawlDepth } from './crawlGraph.js';
import { SEO_STATIC_PATHS } from './seo.js';

/** Maximum navigation depth for static indexable pages from home (91). */
export const MAX_INDEXABLE_STATIC_DEPTH = 2;

export { MAX_INVENTORY_PAGE } from './constants.js';

export const INVENTORY_CANONICAL_PATH = CANONICAL_ROUTES.inventory;

const NON_SITEMAP_KINDS = new Set<AppRouteKind>([
  'unknown',
  'legacy_referral',
  'inventory_referral',
]);

export type InventoryViewState = {
  q?: string;
  quartier?: string;
  taille?: string;
  prixMax?: string | number;
  page?: number | string;
  /** `grille` (default) or `carte` */
  vue?: string;
  hasReferralSlug?: boolean;
};

export type InventoryIndexationReason =
  | 'default'
  | 'filtered'
  | 'search'
  | 'referral'
  | 'paginated'
  | 'view_mode';

export type InventoryIndexation = {
  index: boolean;
  canonicalPath: string;
  reason: InventoryIndexationReason;
};

/** Paths eligible for the XML sitemap — canonical indexable routes only (94). */
export function isSitemapEligiblePathname(pathname: string): boolean {
  const kind = classifyAppPath(pathname);
  if (NON_SITEMAP_KINDS.has(kind)) return false;
  return kind === 'home' || kind === 'inventory' || kind === 'about' || kind === 'listing';
}

export function hasInventorySearchQuery(q?: string): boolean {
  return Boolean(q && q.trim().length >= MIN_SEARCH_QUERY_LENGTH);
}

export function hasInventoryFacets(state: Pick<InventoryViewState, 'quartier' | 'taille' | 'prixMax'>): boolean {
  return Boolean(state.quartier || state.taille || state.prixMax);
}

export function hasInventoryFilters(state: InventoryViewState): boolean {
  return hasInventorySearchQuery(state.q) || hasInventoryFacets(state);
}

export function inventoryPageNumber(page?: number | string): number {
  const raw = typeof page === 'string' ? Number.parseInt(page, 10) : page ?? 1;
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(raw, MAX_INVENTORY_PAGE);
}

/** Maximum page reachable under backend offset limits (26). */
export function maxInventoryPageFromOffset(pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.floor(MAX_LISTINGS_OFFSET / pageSize));
}

export function isNonDefaultInventoryView(state: InventoryViewState): boolean {
  return (
    hasInventoryFilters(state) ||
    Boolean(state.hasReferralSlug) ||
    inventoryPageNumber(state.page) > 1 ||
    state.vue === 'carte'
  );
}

/** Filtered, referral, map-view, or paginated inventory views are near-duplicates of /inventaire (93). */
export function isNearDuplicateInventoryView(state: InventoryViewState): boolean {
  return isNonDefaultInventoryView(state);
}

/** Thin / low-value inventory views should not be indexed (92, 21, 25). */
export function shouldNoindexInventoryView(state: InventoryViewState): boolean {
  return isNearDuplicateInventoryView(state);
}

/** Canonical target for inventory variants — filtered/search/referral → base; paginated → self (24). */
export function resolveInventoryCanonicalPath(state: InventoryViewState): string {
  const pageNum = inventoryPageNumber(state.page);
  if (
    pageNum > 1 &&
    !hasInventoryFilters(state) &&
    !state.hasReferralSlug &&
    state.vue !== 'carte'
  ) {
    return `${INVENTORY_CANONICAL_PATH}?page=${pageNum}`;
  }
  return INVENTORY_CANONICAL_PATH;
}

/**
 * Indexation strategy for inventory — no category/tag/archive pages; only the default grid view
 * is indexable (20–22). Search (`q`) is treated as internal search: noindex + rate-limited API (25).
 */
export function resolveInventoryIndexation(state: InventoryViewState): InventoryIndexation {
  if (state.hasReferralSlug) {
    return { index: false, canonicalPath: INVENTORY_CANONICAL_PATH, reason: 'referral' };
  }
  if (hasInventorySearchQuery(state.q)) {
    return { index: false, canonicalPath: INVENTORY_CANONICAL_PATH, reason: 'search' };
  }
  if (hasInventoryFacets(state)) {
    return { index: false, canonicalPath: INVENTORY_CANONICAL_PATH, reason: 'filtered' };
  }
  const pageNum = inventoryPageNumber(state.page);
  if (pageNum > 1) {
    return {
      index: false,
      canonicalPath: `${INVENTORY_CANONICAL_PATH}?page=${pageNum}`,
      reason: 'paginated',
    };
  }
  if (state.vue === 'carte') {
    return { index: false, canonicalPath: INVENTORY_CANONICAL_PATH, reason: 'view_mode' };
  }
  return { index: true, canonicalPath: INVENTORY_CANONICAL_PATH, reason: 'default' };
}

/** Parameterized inventory URLs that duplicate the canonical catalog view (23). */
export function isParameterizedDuplicateUrl(state: InventoryViewState): boolean {
  return isNonDefaultInventoryView(state);
}

/** Detect pagination crawl traps beyond allowed bounds (26). */
export function isInventoryCrawlTrapPage(
  state: InventoryViewState,
  totalPages?: number,
): boolean {
  const pageNum = inventoryPageNumber(state.page);
  if (pageNum > MAX_INVENTORY_PAGE) return true;
  if (pageNum > maxInventoryPageFromOffset()) return true;
  if (totalPages != null && totalPages >= 1 && pageNum > totalPages) return true;
  return false;
}

/** Static sitemap pages must stay within reasonable crawl depth from home (91). */
export function staticPathWithinNavigationDepth(pathname: string): boolean {
  const depth = staticCrawlDepth(pathname);
  if (depth == null) return true;
  return depth <= MAX_INDEXABLE_STATIC_DEPTH;
}

export function assertSitemapLocPathname(pathname: string): void {
  if (!isSitemapEligiblePathname(pathname)) {
    throw new Error(`Sitemap URL is not indexable: ${pathname}`);
  }
  if (
    SEO_STATIC_PATHS.includes(pathname as (typeof SEO_STATIC_PATHS)[number]) &&
    !staticPathWithinNavigationDepth(pathname)
  ) {
    throw new Error(`Static sitemap URL exceeds navigation depth: ${pathname}`);
  }
}
