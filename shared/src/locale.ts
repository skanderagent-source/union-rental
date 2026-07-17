import {
  buildInternalPath,
  cleanQueryString,
  splitLocalePath,
  withLocalePath,
  type AppLocale,
} from './canonicalUrl.js';
import { buildCanonicalUrl, normalizeSiteOrigin } from './seo.js';

export const SUPPORTED_LOCALES: readonly AppLocale[] = ['fr', 'en'];

export const HREFLANG_BY_LOCALE: Record<AppLocale, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
};

export type HreflangAlternate = {
  hreflang: string;
  href: string;
};

export function localizedInternalPath(
  locale: AppLocale,
  pathname: string,
  search = '',
): string {
  return buildInternalPath(withLocalePath(locale, pathname), search);
}

/** Reciprocal hreflang cluster for a page (fr-CA, en-CA, x-default). */
export function buildHreflangAlternates(
  siteUrl: string,
  pathname: string,
  search = '',
): readonly HreflangAlternate[] {
  const origin = normalizeSiteOrigin(siteUrl);
  const { pathname: basePath } = splitLocalePath(pathname);
  const cleanedSearch = cleanQueryString(
    basePath,
    search.startsWith('?') ? search : search ? `?${search}` : '',
  );

  const frHref = buildCanonicalUrl(origin, localizedInternalPath('fr', basePath, cleanedSearch));
  const enHref = buildCanonicalUrl(origin, localizedInternalPath('en', basePath, cleanedSearch));

  return [
    { hreflang: HREFLANG_BY_LOCALE.fr, href: frHref },
    { hreflang: HREFLANG_BY_LOCALE.en, href: enHref },
    { hreflang: 'x-default', href: frHref },
  ];
}

export function alternateLocale(locale: AppLocale): AppLocale {
  return locale === 'fr' ? 'en' : 'fr';
}

export { DEFAULT_LOCALE, EN_PATH_PREFIX, type AppLocale } from './canonicalUrl.js';
