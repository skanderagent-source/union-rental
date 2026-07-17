import {
  areaCoordsKey,
  resolveAreaCoords,
  type MapListing,
} from '@union-rental/shared';

export type MapMarkerGroup = {
  key: string;
  listings: MapListing[];
  lat: number;
  lng: number;
  approximate: boolean;
};

export function hashOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radius = 0.00035 + (Math.abs(h >> 8) % 20) * 0.00002;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function markerGroup(
  listing: MapListing,
): { key: string; lat: number; lng: number; approximate: boolean } | null {
  if (listing.latitude != null && listing.longitude != null) {
    if (listing.geocodingStatus === 'approximate') {
      const areaKey = areaCoordsKey(listing.quartier);
      const areaCoords = resolveAreaCoords(listing.quartier);
      if (areaKey && areaCoords) {
        return {
          key: `area:${areaKey}`,
          lat: areaCoords[0],
          lng: areaCoords[1],
          approximate: true,
        };
      }
    }

    return {
      key: `exact:${listing.latitude.toFixed(6)}:${listing.longitude.toFixed(6)}`,
      lat: listing.latitude,
      lng: listing.longitude,
      approximate: false,
    };
  }

  const coords = resolveAreaCoords(listing.quartier);
  const key = areaCoordsKey(listing.quartier);
  if (!coords || !key) return null;

  return {
    key: `area:${key}`,
    lat: coords[0],
    lng: coords[1],
    approximate: true,
  };
}

export function buildMapMarkers(listings: MapListing[]) {
  const groups = new Map<string, MapMarkerGroup>();
  let unlocatedCount = 0;

  for (const listing of listings) {
    const group = markerGroup(listing);
    if (!group) {
      unlocatedCount++;
      continue;
    }

    const existing = groups.get(group.key);
    if (existing) {
      existing.listings.push(listing);
      continue;
    }

    const [dx, dy] = group.approximate ? [0, 0] : hashOffset(group.key);
    groups.set(group.key, {
      key: group.key,
      listings: [listing],
      lat: group.lat + dx,
      lng: group.lng + dy,
      approximate: group.approximate,
    });
  }

  return {
    markers: [...groups.values()],
    unlocatedCount,
  };
}

/** @deprecated use buildMapMarkers */
export function resolveMarkerCoords(
  latitude: number | null,
  longitude: number | null,
  quartier: string | null,
  id: string,
): { lat: number; lng: number; approximate: boolean } | null {
  const listing: MapListing = {
    id,
    adresse: '',
    quartier,
    prix: null,
    latitude,
    longitude,
  };
  const group = markerGroup(listing);
  if (!group) return null;
  const [dx, dy] = group.approximate ? [0, 0] : hashOffset(group.key);
  return {
    lat: group.lat + dx,
    lng: group.lng + dy,
    approximate: group.approximate,
  };
}
