import { QUARTIER_COORDS } from '@union-rental/shared';

export function hashOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radius = 0.00035 + (Math.abs(h >> 8) % 20) * 0.00002;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export function resolveMarkerCoords(
  latitude: number | null,
  longitude: number | null,
  quartier: string | null,
  id: string,
): { lat: number; lng: number; approximate: boolean } | null {
  if (latitude != null && longitude != null) {
    const [dx, dy] = hashOffset(id);
    return { lat: latitude + dx, lng: longitude + dy, approximate: false };
  }
  const q = (quartier ?? '').toLowerCase().trim();
  const fallback = QUARTIER_COORDS[q];
  if (!fallback) return null;
  const [dx, dy] = hashOffset(id);
  return { lat: fallback[0] + dx, lng: fallback[1] + dy, approximate: true };
}
