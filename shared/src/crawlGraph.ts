import { SEO_STATIC_PATHS } from './seo.js';
import { CANONICAL_ROUTES } from './canonicalUrl.js';

/** Static navigation edges — same on mobile and desktop (SPA; no separate m. URLs). */
export const STATIC_CRAWL_EDGES: Record<string, readonly string[]> = {
  [CANONICAL_ROUTES.home]: [CANONICAL_ROUTES.inventory, CANONICAL_ROUTES.about],
  [CANONICAL_ROUTES.inventory]: [CANONICAL_ROUTES.home, CANONICAL_ROUTES.about],
  [CANONICAL_ROUTES.about]: [CANONICAL_ROUTES.home, CANONICAL_ROUTES.inventory],
};

/** BFS reachable static paths from home (nav + footer + breadcrumbs). */
export function reachableStaticPaths(startPath: string = CANONICAL_ROUTES.home): Set<string> {
  const reachable = new Set<string>([startPath]);
  const queue = [startPath];

  while (queue.length > 0) {
    const path = queue.shift()!;
    for (const next of STATIC_CRAWL_EDGES[path] ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return reachable;
}

/** Indexable static sitemap paths with no inbound static navigation link. */
export function orphanStaticPaths(): string[] {
  const reachable = reachableStaticPaths();
  return SEO_STATIC_PATHS.filter((path) => !reachable.has(path));
}

/** Maximum crawl depth for static indexable routes from home. */
export function staticCrawlDepth(path: string): number | null {
  const normalized = path === '/' ? '/' : path.replace(/\/$/, '');
  if (!SEO_STATIC_PATHS.includes(normalized as (typeof SEO_STATIC_PATHS)[number])) {
    return null;
  }

  const queue: Array<{ path: string; depth: number }> = [{ path: CANONICAL_ROUTES.home, depth: 0 }];
  const visited = new Set<string>([CANONICAL_ROUTES.home]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path === normalized) return current.depth;

    for (const next of STATIC_CRAWL_EDGES[current.path] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ path: next, depth: current.depth + 1 });
      }
    }
  }

  return null;
}
