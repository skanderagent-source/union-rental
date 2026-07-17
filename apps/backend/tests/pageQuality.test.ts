import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ROUTES,
  assertSitemapLocPathname,
  hasInventorySearchQuery,
  isInventoryCrawlTrapPage,
  isNearDuplicateInventoryView,
  isParameterizedDuplicateUrl,
  isSitemapEligiblePathname,
  maxInventoryPageFromOffset,
  resolveInventoryCanonicalPath,
  resolveInventoryIndexation,
  shouldNoindexInventoryView,
  staticPathWithinNavigationDepth,
} from '@union-rental/shared';

describe('page quality / indexability rules', () => {
  it('allows only canonical indexable paths in the sitemap', () => {
    expect(isSitemapEligiblePathname('/')).toBe(true);
    expect(isSitemapEligiblePathname('/inventaire')).toBe(true);
    expect(isSitemapEligiblePathname('/en/inventaire')).toBe(true);
    expect(isSitemapEligiblePathname('/en/a-propos')).toBe(true);
    expect(isSitemapEligiblePathname('/a-propos')).toBe(true);
    expect(
      isSitemapEligiblePathname('/logement/11111111-1111-4111-8111-111111111111'),
    ).toBe(true);

    expect(isSitemapEligiblePathname('/inventaire/agent123')).toBe(false);
    expect(isSitemapEligiblePathname('/r/agent123')).toBe(false);
    expect(isSitemapEligiblePathname('/unknown-page')).toBe(false);
  });

  it('keeps static pages within navigation depth from home', () => {
    expect(staticPathWithinNavigationDepth(CANONICAL_ROUTES.home)).toBe(true);
    expect(staticPathWithinNavigationDepth(CANONICAL_ROUTES.inventory)).toBe(true);
    expect(staticPathWithinNavigationDepth(CANONICAL_ROUTES.about)).toBe(true);
  });

  it('treats filtered, referral, map-view, and paginated inventory as near-duplicates', () => {
    expect(isNearDuplicateInventoryView({ quartier: 'Rosemont' })).toBe(true);
    expect(isNearDuplicateInventoryView({ hasReferralSlug: true })).toBe(true);
    expect(isNearDuplicateInventoryView({ vue: 'carte' })).toBe(true);
    expect(isNearDuplicateInventoryView({ page: 2 })).toBe(true);
    expect(isNearDuplicateInventoryView({ q: 'rosemont' })).toBe(true);
    expect(isNearDuplicateInventoryView({})).toBe(false);
    expect(shouldNoindexInventoryView({ q: 'loft' })).toBe(true);
  });

  it('resolves inventory indexation and canonical targets for parameterized URLs', () => {
    expect(resolveInventoryIndexation({})).toEqual({
      index: true,
      canonicalPath: '/inventaire',
      reason: 'default',
    });
    expect(resolveInventoryIndexation({ q: 'rosemont' })).toMatchObject({
      index: false,
      canonicalPath: '/inventaire',
      reason: 'search',
    });
    expect(resolveInventoryIndexation({ quartier: 'Rosemont' })).toMatchObject({
      index: false,
      reason: 'filtered',
    });
    expect(resolveInventoryIndexation({ page: 3 })).toEqual({
      index: false,
      canonicalPath: '/inventaire?page=3',
      reason: 'paginated',
    });
    expect(resolveInventoryIndexation({ vue: 'carte' })).toMatchObject({
      index: false,
      reason: 'view_mode',
    });
    expect(resolveInventoryCanonicalPath({ page: 4 })).toBe('/inventaire?page=4');
    expect(resolveInventoryCanonicalPath({ quartier: 'CDN' })).toBe('/inventaire');
    expect(isParameterizedDuplicateUrl({ taille: '3.5' })).toBe(true);
    expect(hasInventorySearchQuery('a')).toBe(false);
    expect(hasInventorySearchQuery('ro')).toBe(true);
  });

  it('detects inventory pagination crawl traps', () => {
    expect(isInventoryCrawlTrapPage({ page: 9999 })).toBe(true);
    expect(isInventoryCrawlTrapPage({ page: 2 }, 1)).toBe(true);
    expect(isInventoryCrawlTrapPage({ page: 2 }, 3)).toBe(false);
    expect(maxInventoryPageFromOffset(24)).toBeGreaterThan(1);
  });

  it('assertSitemapLocPathname rejects ineligible paths', () => {
    expect(() => assertSitemapLocPathname('/r/demo')).toThrow(/not indexable/i);
    expect(() => assertSitemapLocPathname('/inventaire')).not.toThrow();
  });
});
