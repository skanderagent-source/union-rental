import { describe, expect, it } from 'vitest';
import {
  assemblePageJsonLd,
  buildApartmentListingJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  imageMeetsOgMinimum,
  organizationId,
  validateApartmentListingJsonLd,
  validateBreadcrumbJsonLd,
  validateOrganizationJsonLd,
  validateWebSiteJsonLd,
} from '@union-rental/shared';

describe('structured data builders', () => {
  it('builds Organization and WebSite blocks for Greater Montreal', () => {
    const org = buildOrganizationJsonLd('https://logigo.ca');
    const site = buildWebSiteJsonLd('https://logigo.ca', 'fr');

    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe(organizationId('https://logigo.ca'));
    expect(org.logo).toBe('https://logigo.ca/favicon.png');
    expect(org.image).toBe('https://logigo.ca/og-default.jpg');
    expect(org.areaServed).toMatchObject({ name: 'Greater Montreal' });
    expect(site['@type']).toBe('WebSite');
    expect(site.inLanguage).toBe('fr-CA');
    expect(site.publisher).toEqual({ '@id': organizationId('https://logigo.ca') });
    expect(validateOrganizationJsonLd(org)).toEqual([]);
    expect(validateWebSiteJsonLd(site)).toEqual([]);
  });

  it('adds contactPoint when contact page URL is provided', () => {
    const org = buildOrganizationJsonLd('https://logigo.ca', {
      contactPageUrl: 'https://logigo.ca/a-propos#contact',
    });
    expect(org.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: 'https://logigo.ca/a-propos#contact',
    });
  });

  it('assembles page JSON-LD into a single @graph', () => {
    const org = buildOrganizationJsonLd('https://logigo.ca');
    const site = buildWebSiteJsonLd('https://logigo.ca', 'en');
    const graph = assemblePageJsonLd([org, site]);
    expect(graph['@context']).toBe('https://schema.org');
    expect(Array.isArray(graph['@graph'])).toBe(true);
    expect(graph['@graph']).toHaveLength(2);
    expect((graph['@graph'] as Record<string, unknown>[])[0]['@id']).toBe(
      organizationId('https://logigo.ca'),
    );
  });

  it('builds breadcrumb and apartment listing data aligned with visible content', () => {
    const crumbs = buildBreadcrumbJsonLd([
      { name: 'Accueil', url: 'https://logigo.ca/' },
      { name: 'Inventaire', url: 'https://logigo.ca/inventaire' },
      { name: '123 Rue Example', url: 'https://logigo.ca/logement/11111111-1111-4111-8111-111111111111' },
    ]);
    expect(validateBreadcrumbJsonLd(crumbs)).toEqual([]);
    expect(crumbs.itemListElement).toHaveLength(3);

    const listing = buildApartmentListingJsonLd({
      siteUrl: 'https://logigo.ca',
      pageUrl: 'https://logigo.ca/logement/11111111-1111-4111-8111-111111111111',
      name: '123 Rue Example',
      description: 'Appartement à louer à Rosemont dans le Grand Montréal.',
      streetAddress: '123 Rue Example',
      locality: 'Rosemont',
      region: 'Grand Montréal',
      numberOfRooms: 3.5,
      price: 1800,
      priceCurrency: 'CAD',
      imageUrl: 'https://logigo.ca/og-default.jpg',
    });

    expect(listing['@type']).toBe('Apartment');
    expect(listing.name).toBe('123 Rue Example');
    expect(listing.offers).toMatchObject({
      price: 1800,
      priceCurrency: 'CAD',
      availability: 'https://schema.org/InStock',
    });
    expect(validateApartmentListingJsonLd(listing)).toEqual([]);
  });

  it('flags incomplete rental offer metadata', () => {
    const incomplete = buildApartmentListingJsonLd({
      siteUrl: 'https://logigo.ca',
      pageUrl: 'https://logigo.ca/logement/11111111-1111-4111-8111-111111111111',
      name: '123 Rue Example',
      description: 'Test',
      streetAddress: '123 Rue Example',
      locality: 'Rosemont',
      region: 'Grand Montréal',
      numberOfRooms: 3.5,
      price: null,
      priceCurrency: 'CAD',
      imageUrl: null,
    });
    expect(validateApartmentListingJsonLd(incomplete)).toEqual([]);

    const badOffer = {
      ...incomplete,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/OutOfStock',
      },
    };
    expect(validateApartmentListingJsonLd(badOffer)).toContain(
      'Available rental listings must use InStock availability',
    );
  });

  it('validates OG image minimum dimensions', () => {
    expect(imageMeetsOgMinimum(1200, 630)).toBe(true);
    expect(imageMeetsOgMinimum(800, 600)).toBe(false);
  });
});
