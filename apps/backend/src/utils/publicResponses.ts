import type {
  MapListing,
  PublicListing,
  PublicListingDetail,
  PublicMediaItem,
  PublicStats,
  QuartierCount,
} from '@union-rental/shared';
import {
  mapListingSchema,
  publicListingDetailSchema,
  publicListingSchema,
  publicStatsSchema,
  quartierCountSchema,
  referralAgentSchema,
  mediaDownloadUrlSchema,
  createLeadResponseSchema,
} from '@union-rental/shared';
import { sanitizePublicText } from './sanitize.js';

type ListingRow = {
  id: string;
  adresse: string;
  quartier: string | null;
  prix: unknown;
  taille: string | null;
  electromenagers: string | null;
  notes: string | null;
  statut: string;
  latitude: unknown;
  longitude: unknown;
  geocoding_status?: string | null;
  approved_image_count?: number;
  approved_media_count?: number;
};

type MapListingRow = Pick<
  ListingRow,
  'id' | 'adresse' | 'quartier' | 'prix' | 'latitude' | 'longitude' | 'geocoding_status'
>;

/** Supabase may return Postgres numeric columns as strings. */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toPublicListingResponse(
  row: ListingRow,
  thumbnail: { url: string; type: 'image' | 'video' } | null,
): PublicListing {
  return publicListingSchema.parse({
    id: row.id,
    adresse: sanitizePublicText(row.adresse) ?? '',
    quartier: sanitizePublicText(row.quartier),
    prix: toNullableNumber(row.prix),
    taille: sanitizePublicText(row.taille),
    electromenagers: sanitizePublicText(row.electromenagers),
    notes: sanitizePublicText(row.notes),
    statut: row.statut,
    latitude: toNullableNumber(row.latitude),
    longitude: toNullableNumber(row.longitude),
    approvedImageCount: row.approved_image_count ?? 0,
    approvedMediaCount: row.approved_media_count ?? 0,
    thumbnailUrl: thumbnail?.url ?? null,
    thumbnailType: thumbnail?.type ?? null,
  });
}

export function toPublicListingDetailResponse(
  row: ListingRow,
  thumbnail: { url: string; type: 'image' | 'video' } | null,
  media: PublicMediaItem[],
): PublicListingDetail {
  return publicListingDetailSchema.parse({
    ...toPublicListingResponse(row, thumbnail),
    media,
  });
}

export function toMapListingResponse(row: MapListingRow): MapListing {
  const status = row.geocoding_status;
  const allowed = new Set(['pending', 'success', 'failed', 'manual', 'approximate']);

  const parsed = mapListingSchema.parse({
    id: row.id,
    adresse: sanitizePublicText(row.adresse) ?? '',
    quartier: sanitizePublicText(row.quartier),
    prix: toNullableNumber(row.prix),
    latitude: toNullableNumber(row.latitude),
    longitude: toNullableNumber(row.longitude),
    ...(status && allowed.has(status) ? { geocodingStatus: status } : {}),
  });

  const result: MapListing = {
    id: parsed.id,
    adresse: parsed.adresse,
    quartier: parsed.quartier,
    prix: parsed.prix,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
  };
  if (parsed.geocodingStatus !== undefined) {
    result.geocodingStatus = parsed.geocodingStatus;
  }
  return result;
}

export function toPublicStatsResponse(stats: PublicStats): PublicStats {
  return publicStatsSchema.parse(stats);
}

export function toQuartierCountResponse(rows: QuartierCount[]): QuartierCount[] {
  return rows.map((row) => quartierCountSchema.parse(row));
}

export function toReferralAgentResponse(data: { agentId: string; nom: string }) {
  return referralAgentSchema.parse({
    agentId: data.agentId,
    nom: sanitizePublicText(data.nom) ?? data.nom,
  });
}

export function toMediaDownloadUrlResponse(data: { url: string; expiresInSeconds: number }) {
  return mediaDownloadUrlSchema.parse(data);
}

export function toCreateLeadResponse(data: { received: true }) {
  return createLeadResponseSchema.parse(data);
}
