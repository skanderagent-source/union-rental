import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OG_IMAGE_BY_TEMPLATE,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_STATIC_PATHS,
  SEO_TITLE_MAX_LENGTH,
  truncateSeoText,
} from '@union-rental/shared';

const FR_PATH = resolve(import.meta.dirname, '../../frontend/src/i18n/fr.ts');
const EN_PATH = resolve(import.meta.dirname, '../../frontend/src/i18n/en.ts');

const PAGE_META_KEYS = [
  'meta.home.title',
  'meta.home.description',
  'meta.inventory.title',
  'meta.inventory.description',
  'meta.about.title',
  'meta.about.description',
  'meta.notfound.title',
  'meta.notfound.description',
  'meta.unavailable.title',
  'meta.unavailable.description',
] as const;

function readDictionary(path: string): Record<string, string> {
  const source = readFileSync(path, 'utf8');
  const entries: Record<string, string> = {};
  const pattern = /^\s+'([^']+)'\s*:\s*'((?:\\'|[^'])*)'/gm;
  for (const match of source.matchAll(pattern)) {
    entries[match[1]!] = match[2]!.replace(/\\'/g, "'");
  }
  return entries;
}

describe('page template SEO rules at scale', () => {
  it('maps each static indexable route to a build-time OG image template', () => {
    expect(Object.keys(OG_IMAGE_BY_TEMPLATE).sort()).toEqual(['about', 'home', 'inventory']);
    expect(SEO_STATIC_PATHS).toEqual(['/', '/inventaire', '/a-propos']);
  });

  it('keeps meta title and description keys present in both locales', () => {
    const fr = readDictionary(FR_PATH);
    const en = readDictionary(EN_PATH);

    for (const key of PAGE_META_KEYS) {
      expect(fr[key], `missing fr ${key}`).toBeTruthy();
      expect(en[key], `missing en ${key}`).toBeTruthy();
      expect(fr[key]).not.toEqual(en[key]);
    }
  });

  it('enforces unique, bounded title and description text for template strings', () => {
    const fr = readDictionary(FR_PATH);
    const titles = PAGE_META_KEYS.filter((key) => key.endsWith('.title')).map((key) => fr[key]!);
    const descriptions = PAGE_META_KEYS.filter((key) => key.endsWith('.description')).map(
      (key) => fr[key]!,
    );

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);

    for (const title of titles) {
      expect(truncateSeoText(title, SEO_TITLE_MAX_LENGTH).length).toBeLessThanOrEqual(
        SEO_TITLE_MAX_LENGTH,
      );
    }
    for (const description of descriptions) {
      expect(truncateSeoText(description, SEO_DESCRIPTION_MAX_LENGTH).length).toBeLessThanOrEqual(
        SEO_DESCRIPTION_MAX_LENGTH,
      );
    }
  });
});
