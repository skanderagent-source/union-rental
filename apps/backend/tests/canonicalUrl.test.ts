import './setup.js';
import { describe, expect, it } from 'vitest';
import {
  buildCanonicalUrl,
  buildHreflangAlternates,
  cleanQueryString,
  classifyAppPath,
  resolveCanonicalRedirect,
} from '@union-rental/shared';

describe('canonical URL utilities', () => {
  it('classifies known app routes', () => {
    expect(classifyAppPath('/inventaire')).toBe('inventory');
    expect(classifyAppPath('/en/inventaire')).toBe('inventory');
    expect(classifyAppPath('/en')).toBe('home');
    expect(classifyAppPath('/logement/11111111-1111-4111-8111-111111111111')).toBe('listing');
    expect(classifyAppPath('/en/logement/11111111-1111-4111-8111-111111111111')).toBe('listing');
    expect(classifyAppPath('/inventaire/agent123')).toBe('inventory_referral');
    expect(classifyAppPath('/random-page')).toBe('unknown');
  });

  it('preserves locale when normalizing inventory URLs', () => {
    expect(
      resolveCanonicalRedirect('/en/inventaire/', '?quartier=Rosemont&utm_source=ads&page=2'),
    ).toEqual({
      pathname: '/en/inventaire',
      search: '?quartier=Rosemont&page=2',
    });
  });

  it('redirects legacy referral listing links in one hop', () => {
    expect(
      resolveCanonicalRedirect(
        '/r/agent123/logement/11111111-1111-4111-8111-111111111111',
        '',
      ),
    ).toEqual({
      pathname: '/logement/11111111-1111-4111-8111-111111111111',
      search: '',
    });
  });

  it('normalizes trailing slashes, casing, and tracking params', () => {
    expect(
      resolveCanonicalRedirect('/Inventaire/', '?quartier=Rosemont&utm_source=ads&page=2'),
    ).toEqual({
      pathname: '/inventaire',
      search: '?quartier=Rosemont&page=2',
    });
  });

  it('strips tracking params from inventory URLs', () => {
    expect(cleanQueryString('/inventaire', '?quartier=CDN&ref=agent&fbclid=abc')).toBe(
      '?quartier=CDN',
    );
  });

  it('preserves listing param on referral inventory URLs', () => {
    const listingId = 'd5b4c37b-cb67-4871-9707-49efa5bd84f6';
    expect(
      cleanQueryString('/inventaire/frepoc', `?listing=${listingId}&utm_source=ads`),
    ).toBe(`?listing=${listingId}`);
    expect(resolveCanonicalRedirect('/inventaire/frepoc', `?listing=${listingId}`)).toBeNull();
  });

  it('normalizes inventory query params by stripping defaults and capping page', () => {
    expect(cleanQueryString('/inventaire', '?page=1&vue=grille&utm_source=ads')).toBe('');
    expect(cleanQueryString('/inventaire', '?page=9999&quartier=Rosemont')).toBe(
      '?quartier=Rosemont&page=500',
    );
    expect(cleanQueryString('/inventaire', '?vue=carte')).toBe('?vue=carte');
  });

  it('redirects invalid referral inventory paths to /inventaire', () => {
    expect(resolveCanonicalRedirect('/inventaire/john-doe', '')).toEqual({
      pathname: '/inventaire',
      search: '',
    });
    expect(resolveCanonicalRedirect('/inventaire/ab', '')).toEqual({
      pathname: '/inventaire',
      search: '',
    });
  });

  it('redirects bare legacy referral links to inventory', () => {
    expect(resolveCanonicalRedirect('/r/agent123', '')).toEqual({
      pathname: '/inventaire',
      search: '',
    });
  });

  it('builds absolute canonical URLs that match sitemap format', () => {
    expect(buildCanonicalUrl('https://WWW.LogiGo.ca', '/inventaire')).toBe(
      'https://www.logigo.ca/inventaire',
    );
  });

  it('builds reciprocal hreflang clusters with x-default on French', () => {
    const alternates = buildHreflangAlternates('https://logigo.ca', '/inventaire');
    expect(alternates).toHaveLength(3);

    const byLang = Object.fromEntries(alternates.map((item) => [item.hreflang, item.href]));
    expect(byLang['fr-CA']).toBe('https://logigo.ca/inventaire');
    expect(byLang['en-CA']).toBe('https://logigo.ca/en/inventaire');
    expect(byLang['x-default']).toBe(byLang['fr-CA']);

    const enAlternates = buildHreflangAlternates('https://logigo.ca', '/en/inventaire');
    expect(enAlternates.map((item) => item.href)).toEqual(alternates.map((item) => item.href));
  });
});
