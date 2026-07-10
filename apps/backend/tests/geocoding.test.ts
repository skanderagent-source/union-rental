import { describe, expect, it } from 'vitest';
import { buildGeocodeQuery, normalizeGeocodeAddress } from '../src/modules/geocoding/geocoding.helpers.js';

describe('geocoding helpers (Fast Rental compatible)', () => {
  it('buildGeocodeQuery matches Fast Rental format', () => {
    expect(buildGeocodeQuery({
      adresse: '4037 Adam',
      quartier: 'Rosemont',
      ville: 'Montréal',
    })).toBe('4037 Adam, Rosemont, Montréal, Québec, Canada');
  });

  it('normalizeGeocodeAddress matches Fast Rental cache keys', () => {
    expect(normalizeGeocodeAddress('Montréal, Québec')).toBe('montreal, quebec');
  });
});
