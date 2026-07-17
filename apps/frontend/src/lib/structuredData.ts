import {
  assemblePageJsonLd,
  buildApartmentListingJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  DEFAULT_OG_IMAGE_PATH,
  OG_IMAGE_BY_TEMPLATE,
  type BreadcrumbItem,
  type JsonLd,
  type OgImageTemplate,
} from '@union-rental/shared';
import type { PublicListingDetail } from '@union-rental/shared';
import type { Lang } from '@/i18n';
import { getSafeMediaUrl } from '@/lib/safeUrl';
import { localizedCanonicalUrl, siteOrigin } from '@/lib/siteUrl';
import { routes } from '@/lib/routes';

export function defaultOgImageUrl(): string {
  return `${siteOrigin}${DEFAULT_OG_IMAGE_PATH}`;
}

export function ogImageUrlForTemplate(template: OgImageTemplate): string {
  return `${siteOrigin}${OG_IMAGE_BY_TEMPLATE[template]}`;
}

export function defaultOgImageWebpUrl(): string {
  return `${siteOrigin}/og-default.webp`;
}

export function listingOgImageUrl(
  media: ReadonlyArray<{ type: string; viewUrl: string }>,
): string | null {
  const firstImage = media.find((item) => item.type === 'image' && item.viewUrl);
  if (!firstImage) return null;
  return getSafeMediaUrl(firstImage.viewUrl);
}

function pageGraph(...blocks: JsonLd[]): JsonLd {
  return assemblePageJsonLd(blocks);
}

function breadcrumbItems(items: BreadcrumbItem[]): JsonLd {
  return buildBreadcrumbJsonLd(items);
}

export function buildSiteJsonLd(lang: Lang, contactPageUrl?: string): JsonLd {
  return pageGraph(
    buildOrganizationJsonLd(siteOrigin, contactPageUrl ? { contactPageUrl } : {}),
    buildWebSiteJsonLd(siteOrigin, lang),
  );
}

function localizedUrl(lang: Lang, pathname: string): string {
  return localizedCanonicalUrl(lang, pathname);
}

export function buildHomeJsonLd(lang: Lang, homeLabel: string): JsonLd {
  return pageGraph(
    buildOrganizationJsonLd(siteOrigin),
    buildWebSiteJsonLd(siteOrigin, lang),
    breadcrumbItems([{ name: homeLabel, url: localizedUrl(lang, routes.home) }]),
  );
}

export function buildInventoryJsonLd(
  lang: Lang,
  labels: { home: string; inventory: string },
): JsonLd {
  return pageGraph(
    buildOrganizationJsonLd(siteOrigin),
    buildWebSiteJsonLd(siteOrigin, lang),
    breadcrumbItems([
      { name: labels.home, url: localizedUrl(lang, routes.home) },
      { name: labels.inventory, url: localizedUrl(lang, routes.inventory) },
    ]),
  );
}

export function buildAboutJsonLd(
  lang: Lang,
  labels: { home: string; about: string },
): JsonLd {
  const contactPageUrl = `${localizedUrl(lang, routes.about)}#contact`;
  return pageGraph(
    buildOrganizationJsonLd(siteOrigin, { contactPageUrl }),
    buildWebSiteJsonLd(siteOrigin, lang),
    breadcrumbItems([
      { name: labels.home, url: localizedUrl(lang, routes.home) },
      { name: labels.about, url: localizedUrl(lang, routes.about) },
    ]),
  );
}

export function buildListingJsonLd(
  listing: PublicListingDetail,
  lang: Lang,
  labels: { home: string; inventory: string },
  description: string,
): JsonLd {
  const pageUrl = localizedUrl(lang, `/logement/${listing.id}`);
  const rooms = listing.taille ? Number.parseFloat(listing.taille) : null;

  return pageGraph(
    buildOrganizationJsonLd(siteOrigin),
    buildWebSiteJsonLd(siteOrigin, lang),
    breadcrumbItems([
      { name: labels.home, url: localizedUrl(lang, routes.home) },
      { name: labels.inventory, url: localizedUrl(lang, routes.inventory) },
      { name: listing.adresse, url: pageUrl },
    ]),
    buildApartmentListingJsonLd({
      siteUrl: siteOrigin,
      pageUrl,
      name: listing.adresse,
      description,
      streetAddress: listing.adresse,
      locality: listing.quartier,
      region: lang === 'fr' ? 'Grand Montréal' : 'Greater Montreal',
      numberOfRooms: Number.isFinite(rooms ?? NaN) ? rooms : null,
      price: listing.prix,
      priceCurrency: 'CAD',
      imageUrl: listingOgImageUrl(listing.media) ?? defaultOgImageUrl(),
    }),
  );
}

export function buildListingOgImageAlt(listing: PublicListingDetail, lang: Lang): string {
  const location = listing.quartier ?? (lang === 'fr' ? 'Grand Montréal' : 'Greater Montreal');
  return `${listing.adresse} — ${location} | LogiGo`;
}

export { SITE_BRAND as siteBrand } from '@union-rental/shared';
export type { BreadcrumbItem };
