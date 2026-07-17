import { buildCanonicalUrl, localizedInternalPath, normalizeSiteOrigin } from '@union-rental/shared';
import type { Lang } from '@/i18n';
import { env } from './env';

export const siteOrigin = normalizeSiteOrigin(env.VITE_SITE_URL);

export function canonicalUrlForPath(pathname: string): string {
  return buildCanonicalUrl(env.VITE_SITE_URL, pathname);
}

export function localizedCanonicalUrl(lang: Lang, pathname: string, search = ''): string {
  return buildCanonicalUrl(env.VITE_SITE_URL, localizedInternalPath(lang, pathname, search));
}
