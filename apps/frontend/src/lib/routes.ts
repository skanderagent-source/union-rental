import { buildInternalPath, CANONICAL_ROUTES, withLocalePath, type AppLocale } from '@union-rental/shared';
import type { Lang } from '@/i18n';

export { CANONICAL_ROUTES };

export const routes = CANONICAL_ROUTES;

export function localizedRoute(lang: Lang | AppLocale, path: keyof typeof CANONICAL_ROUTES): string {
  return withLocalePath(lang, CANONICAL_ROUTES[path]);
}

export function inventoryPath(search = '', lang: Lang = 'fr'): string {
  const query = search.startsWith('?') ? search : search ? `?${search}` : '';
  return buildInternalPath(withLocalePath(lang, CANONICAL_ROUTES.inventory), query);
}

export function listingPath(listingId: string): string {
  return buildInternalPath(`/logement/${listingId}`);
}

export function aboutPath(): string {
  return CANONICAL_ROUTES.about;
}

export function homePath(): string {
  return CANONICAL_ROUTES.home;
}
