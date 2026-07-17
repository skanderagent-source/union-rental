import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ROUTES,
  orphanStaticPaths,
  reachableStaticPaths,
  staticCrawlDepth,
} from '@union-rental/shared';

describe('crawl graph', () => {
  it('reaches all static sitemap paths from home', () => {
    const reachable = reachableStaticPaths();
    expect(reachable.has(CANONICAL_ROUTES.home)).toBe(true);
    expect(reachable.has(CANONICAL_ROUTES.inventory)).toBe(true);
    expect(reachable.has(CANONICAL_ROUTES.about)).toBe(true);
    expect(orphanStaticPaths()).toEqual([]);
  });

  it('keeps static crawl depth within two hops from home', () => {
    expect(staticCrawlDepth(CANONICAL_ROUTES.home)).toBe(0);
    expect(staticCrawlDepth(CANONICAL_ROUTES.inventory)).toBe(1);
    expect(staticCrawlDepth(CANONICAL_ROUTES.about)).toBe(1);
  });
});
