import { describe, expect, it } from 'vitest';
import { areaCoordsKey, resolveAreaCoords } from '@union-rental/shared';
import { buildMapMarkers } from '../../apps/frontend/src/lib/mapUtils.ts';

describe('area coordinate lookup', () => {
  it('resolves common sheet area labels', () => {
    expect(resolveAreaCoords('South Shore')).toEqual([45.518, -73.435]);
    expect(resolveAreaCoords('parc ex')).toEqual([45.528, -73.638]);
    expect(resolveAreaCoords('Montreal West(city)')).toEqual([45.457, -73.641]);
    expect(resolveAreaCoords('montreal north')).toEqual([45.59, -73.635]);
  });

  it('groups listings in the same area cluster', () => {
    expect(areaCoordsKey('parc ex')).toBe(areaCoordsKey('parc extension'));
  });
});

describe('buildMapMarkers', () => {
  it('clusters ungeocoded listings by area with a count', () => {
    const listings = [
      { id: '1', adresse: 'A1', quartier: 'parc ex', prix: 900, latitude: null, longitude: null },
      { id: '2', adresse: 'A2', quartier: 'parc extension', prix: 950, latitude: null, longitude: null },
      { id: '3', adresse: 'A3', quartier: 'Rosemont', prix: 1000, latitude: null, longitude: null },
    ];

    const { markers, unlocatedCount } = buildMapMarkers(listings);
    expect(unlocatedCount).toBe(0);
    expect(markers).toHaveLength(2);

    const parcCluster = markers.find((marker) => marker.listings.length === 2);
    expect(parcCluster?.approximate).toBe(true);
    expect(parcCluster?.listings).toHaveLength(2);
  });

  it('clusters approximate geocodes by area instead of exact coords', () => {
    const listings = [
      {
        id: '1',
        adresse: 'A1',
        quartier: 'Rosemont',
        prix: 900,
        latitude: 45.541,
        longitude: -73.581,
        geocodingStatus: 'approximate' as const,
      },
      {
        id: '2',
        adresse: 'A2',
        quartier: 'rosemont',
        prix: 950,
        latitude: 45.539,
        longitude: -73.579,
        geocodingStatus: 'approximate' as const,
      },
    ];

    const { markers } = buildMapMarkers(listings);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.listings).toHaveLength(2);
    expect(markers[0]?.approximate).toBe(true);
  });
});
