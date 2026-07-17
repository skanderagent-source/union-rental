import {
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  resolveInventoryIndexation,
  truncateSeoText,
} from '@union-rental/shared';
import type { PublicListingDetail } from '@union-rental/shared';
import type { Lang } from '@/i18n';
import { fmtPriceMonth } from './format';

const BRAND = 'LogiGo';

function composeTitle(primary: string): string {
  const base = truncateSeoText(primary.replace(/\s+/g, ' ').trim(), SEO_TITLE_MAX_LENGTH);
  if (!base) return BRAND;
  if (base.toLowerCase().includes(BRAND.toLowerCase())) return base;
  const suffix = ` | ${BRAND}`;
  const maxPrimary = SEO_TITLE_MAX_LENGTH - suffix.length;
  if (maxPrimary <= 0) return truncateSeoText(BRAND, SEO_TITLE_MAX_LENGTH);
  return `${truncateSeoText(base, maxPrimary)}${suffix}`;
}

function composeDescription(text: string): string {
  return truncateSeoText(text.replace(/\s+/g, ' ').trim(), SEO_DESCRIPTION_MAX_LENGTH);
}

export function buildHomeSeo(lang: Lang, t: (key: string) => string) {
  return {
    title: composeTitle(t('meta.home.title')),
    description: composeDescription(t('meta.home.description')),
  };
}

export function buildInventorySeo(
  lang: Lang,
  t: (key: string) => string,
  filters: {
    q?: string;
    quartier?: string;
    taille?: string;
    prixMax?: string | number;
    page?: number | string;
    vue?: string;
    hasReferralSlug?: boolean;
  },
) {
  const indexation = resolveInventoryIndexation({
    q: filters.q,
    quartier: filters.quartier,
    taille: filters.taille,
    prixMax: filters.prixMax,
    page: filters.page,
    vue: filters.vue,
    hasReferralSlug: filters.hasReferralSlug,
  });

  if (indexation.reason === 'filtered' || indexation.reason === 'search') {
    const parts: string[] = [];
    if (filters.quartier) parts.push(filters.quartier);
    if (filters.taille) parts.push(`${filters.taille}${lang === 'fr' ? '½' : ''}`);
    if (filters.q) parts.push(filters.q);
    if (filters.prixMax) {
      const prix = Number(filters.prixMax);
      if (Number.isFinite(prix)) {
        parts.push(
          lang === 'fr'
            ? `max ${prix.toLocaleString('fr-CA')} $`
            : `max $${prix.toLocaleString('en-CA')}`,
        );
      }
    }

    const filteredTitle =
      lang === 'fr'
        ? `Appartements${parts.length ? ` — ${parts.join(', ')}` : ''}`
        : `Apartments${parts.length ? ` — ${parts.join(', ')}` : ''}`;

    return {
      title: composeTitle(filteredTitle),
      description: composeDescription(t('meta.inventory.filteredDescription')),
      index: false,
      canonicalPath: indexation.canonicalPath,
    };
  }

  if (indexation.reason === 'paginated') {
    const pageNum = Number(String(filters.page)) || 1;
    return {
      title: composeTitle(
        lang === 'fr' ? `Inventaire — page ${pageNum}` : `Inventory — page ${pageNum}`,
      ),
      description: composeDescription(t('meta.inventory.description')),
      index: false,
      canonicalPath: indexation.canonicalPath,
    };
  }

  if (!indexation.index) {
    return {
      title: composeTitle(t('meta.inventory.title')),
      description: composeDescription(t('meta.inventory.description')),
      index: false,
      canonicalPath: indexation.canonicalPath,
    };
  }

  return {
    title: composeTitle(t('meta.inventory.title')),
    description: composeDescription(t('meta.inventory.description')),
    index: true,
    canonicalPath: indexation.canonicalPath,
  };
}

export function buildAboutSeo(t: (key: string) => string) {
  return {
    title: composeTitle(t('meta.about.title')),
    description: composeDescription(t('meta.about.description')),
  };
}

export function buildNotFoundSeo(t: (key: string) => string) {
  return {
    title: composeTitle(t('meta.notfound.title')),
    description: composeDescription(t('meta.notfound.description')),
    index: false,
  };
}

export function buildUnavailableListingSeo(t: (key: string) => string) {
  return {
    title: composeTitle(t('meta.unavailable.title')),
    description: composeDescription(t('meta.unavailable.description')),
    index: false,
  };
}

export function buildListingSeo(
  listing: PublicListingDetail,
  lang: Lang,
  t: (key: string) => string,
) {
  const location = [listing.adresse, listing.quartier].filter(Boolean).join(', ');
  const price = fmtPriceMonth(listing.prix, lang, t);
  const size = listing.taille ? `${listing.taille}${lang === 'fr' ? '½' : ''}` : null;

  const titlePrimary =
    lang === 'fr'
      ? [location, size, price !== t('listing.priceOnRequest') ? price : null]
          .filter(Boolean)
          .join(' — ')
      : [location, size, price !== t('listing.priceOnRequest') ? price : null]
          .filter(Boolean)
          .join(' — ');

  const descriptionParts =
    lang === 'fr'
      ? [
          `Appartement à louer${listing.quartier ? ` à ${listing.quartier}` : ' dans le Grand Montréal'}.`,
          listing.taille ? `Taille ${listing.taille}½.` : null,
          price !== t('listing.priceOnRequest') ? `Loyer ${price}.` : null,
          listing.electromenagers ? `${listing.electromenagers}.` : null,
          'Demandez un rappel sur LogiGo.',
        ]
      : [
          `Apartment for rent${listing.quartier ? ` in ${listing.quartier}` : ' in Greater Montreal'}.`,
          listing.taille ? `${listing.taille} rooms.` : null,
          price !== t('listing.priceOnRequest') ? `Rent ${price}.` : null,
          listing.electromenagers ? `${listing.electromenagers}.` : null,
          'Request a callback on LogiGo.',
        ];

  return {
    title: composeTitle(titlePrimary || listing.adresse),
    description: composeDescription(descriptionParts.filter(Boolean).join(' ')),
  };
}

export function buildReferralInventorySeo(t: (key: string) => string) {
  const indexation = resolveInventoryIndexation({ hasReferralSlug: true });
  return {
    title: composeTitle(t('meta.inventory.title')),
    description: composeDescription(t('meta.inventory.description')),
    index: indexation.index,
    canonicalPath: indexation.canonicalPath,
  };
}
