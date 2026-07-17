import { DEFAULT_OG_IMAGE_PATH, normalizeSiteOrigin } from './seo.js';

export const SITE_BRAND = 'LogiGo';
export const SITE_REGION_EN = 'Greater Montreal';
export const SITE_REGION_FR = 'Grand Montréal';

/** Rental listing availability in Schema.org Offer (29). */
export const RENTAL_AVAILABILITY_IN_STOCK = 'https://schema.org/InStock';
export const RENTAL_AVAILABILITY_OUT_OF_STOCK = 'https://schema.org/OutOfStock';
export const RENTAL_LEASE_BUSINESS_FUNCTION = 'http://purl.org/goodrelations/v1#LeaseOut';

export const ORGANIZATION_ID_SUFFIX = '#organization';

/** Recommended Open Graph large-image minimum (Facebook / LinkedIn). */
export const OG_IMAGE_MIN_WIDTH = 1200;
export const OG_IMAGE_MIN_HEIGHT = 630;

/** Minimum for Twitter summary_large_image. */
export const TWITTER_IMAGE_MIN_WIDTH = 300;
export const TWITTER_IMAGE_MIN_HEIGHT = 157;

export type JsonLd = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type OrganizationJsonLdOptions = {
  contactPageUrl?: string;
};

export type ApartmentListingInput = {
  siteUrl: string;
  pageUrl: string;
  name: string;
  description: string;
  streetAddress: string;
  locality: string | null;
  region: string;
  numberOfRooms: number | null;
  price: number | null;
  priceCurrency: string;
  imageUrl: string | null;
};

export function organizationId(siteUrl: string): string {
  return `${normalizeSiteOrigin(siteUrl)}${ORGANIZATION_ID_SUFFIX}`;
}

export function absoluteSiteAsset(siteUrl: string, assetPath: string): string {
  const origin = normalizeSiteOrigin(siteUrl);
  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${origin}${path}`;
}

export function buildOrganizationJsonLd(
  siteUrl: string,
  options: OrganizationJsonLdOptions = {},
): JsonLd {
  const origin = normalizeSiteOrigin(siteUrl);
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: SITE_BRAND,
    url: origin,
    logo: absoluteSiteAsset(siteUrl, '/favicon.png'),
    image: absoluteSiteAsset(siteUrl, DEFAULT_OG_IMAGE_PATH),
    areaServed: {
      '@type': 'AdministrativeArea',
      name: SITE_REGION_EN,
    },
  };

  if (options.contactPageUrl) {
    data.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: SITE_REGION_EN,
      availableLanguage: ['fr-CA', 'en-CA'],
      url: options.contactPageUrl,
    };
  }

  return data;
}

export function buildWebSiteJsonLd(siteUrl: string, lang: 'fr' | 'en'): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${normalizeSiteOrigin(siteUrl)}/#website`,
    name: SITE_BRAND,
    url: normalizeSiteOrigin(siteUrl),
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    publisher: {
      '@id': organizationId(siteUrl),
    },
  };
}

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Combine page-level JSON-LD nodes into one graph to avoid duplicate entities. */
export function assemblePageJsonLd(blocks: readonly JsonLd[]): JsonLd {
  const graph = blocks.map((block) => {
    const { '@context': _context, ...node } = block;
    return node;
  });
  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

/** Rental listing schema — uses `Apartment`, not e-commerce `Product`. */
export function buildApartmentListingJsonLd(input: ApartmentListingInput): JsonLd {
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: input.name,
    description: input.description,
    url: input.pageUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.streetAddress,
      addressLocality: input.locality ?? 'Montréal',
      addressRegion: 'QC',
      addressCountry: 'CA',
    },
  };

  if (input.numberOfRooms != null && Number.isFinite(input.numberOfRooms)) {
    data.numberOfRooms = input.numberOfRooms;
  }

  if (input.imageUrl) {
    data.image = input.imageUrl;
  }

  if (input.price != null && Number.isFinite(input.price)) {
    data.offers = {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: input.priceCurrency,
      availability: RENTAL_AVAILABILITY_IN_STOCK,
      businessFunction: RENTAL_LEASE_BUSINESS_FUNCTION,
    };
  }

  return data;
}

export function validateOrganizationJsonLd(data: JsonLd): string[] {
  const issues: string[] = [];
  if (data['@type'] !== 'Organization') issues.push('Organization @type missing');
  if (!data.name) issues.push('Organization name missing');
  if (!data.url) issues.push('Organization url missing');
  return issues;
}

export function validateWebSiteJsonLd(data: JsonLd): string[] {
  const issues: string[] = [];
  if (data['@type'] !== 'WebSite') issues.push('WebSite @type missing');
  if (!data.name) issues.push('WebSite name missing');
  if (!data.url) issues.push('WebSite url missing');
  return issues;
}

export function validateBreadcrumbJsonLd(data: JsonLd): string[] {
  const issues: string[] = [];
  if (data['@type'] !== 'BreadcrumbList') issues.push('BreadcrumbList @type missing');
  const items = data.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    issues.push('BreadcrumbList itemListElement missing');
  }
  return issues;
}

export function validateApartmentListingJsonLd(data: JsonLd): string[] {
  const issues: string[] = [];
  if (data['@type'] !== 'Apartment') issues.push('Apartment @type missing');
  if (!data.name) issues.push('Apartment name missing');
  if (!data.url) issues.push('Apartment url missing');
  if (!data.address || typeof data.address !== 'object') {
    issues.push('Apartment address missing');
  }

  const offers = data.offers;
  if (offers != null) {
    if (typeof offers !== 'object' || Array.isArray(offers)) {
      issues.push('Apartment offers must be a single Offer object');
    } else {
      const offer = offers as JsonLd;
      if (offer['@type'] !== 'Offer') issues.push('Apartment offers @type missing');
      if (offer.price == null || !Number.isFinite(Number(offer.price))) {
        issues.push('Apartment offer price missing or invalid');
      }
      if (!offer.priceCurrency || typeof offer.priceCurrency !== 'string') {
        issues.push('Apartment offer priceCurrency missing');
      }
      if (offer.availability !== RENTAL_AVAILABILITY_IN_STOCK) {
        issues.push('Available rental listings must use InStock availability');
      }
      if (offer.businessFunction !== RENTAL_LEASE_BUSINESS_FUNCTION) {
        issues.push('Rental offers must declare LeaseOut businessFunction');
      }
    }
  }

  return issues;
}

/**
 * Union Rental uses Apartment + Offer for rentals — not e-commerce Product (27), Book (28),
 * Review (31), FAQPage (32), SearchAction (33), VideoObject (34), Author (35), or Article (36).
 */
export const RENTAL_STRUCTURED_DATA_TYPES = [
  'Organization',
  'WebSite',
  'BreadcrumbList',
  'Apartment',
  'Offer',
] as const;

export function imageMeetsOgMinimum(width: number, height: number): boolean {
  return width >= OG_IMAGE_MIN_WIDTH && height >= OG_IMAGE_MIN_HEIGHT;
}

export function imageMeetsTwitterLargeMinimum(width: number, height: number): boolean {
  return width >= TWITTER_IMAGE_MIN_WIDTH && height >= TWITTER_IMAGE_MIN_HEIGHT;
}
