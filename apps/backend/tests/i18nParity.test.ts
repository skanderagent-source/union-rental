import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FR_PATH = resolve(import.meta.dirname, '../../frontend/src/i18n/fr.ts');
const EN_PATH = resolve(import.meta.dirname, '../../frontend/src/i18n/en.ts');

function extractTranslationKeys(source: string): string[] {
  const keys: string[] = [];
  const pattern = /^\s+(?:'([^']+)'|(\w+))\s*:/gm;
  for (const match of source.matchAll(pattern)) {
    keys.push(match[1] ?? match[2]!);
  }
  return keys.sort();
}

describe('i18n translation parity', () => {
  it('keeps French and English dictionaries in sync', () => {
    const frKeys = extractTranslationKeys(readFileSync(FR_PATH, 'utf8'));
    const enKeys = extractTranslationKeys(readFileSync(EN_PATH, 'utf8'));

    expect(frKeys).toEqual(enKeys);
  });
});
