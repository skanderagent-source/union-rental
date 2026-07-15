import {
  MAP_RESULT_CAP,
  type PublicListing,
  type PublicListingDetail,
  type PublicListingsQuery,
  type MapListing,
  type PublicStats,
  type QuartierCount,
  type PublicMediaItem,
} from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { resolveViewUrl, resolveDownloadUrl } from '../media/mediaUrl.service.js';
import { openLocalObject, localObjectExists } from '../media/localStorage.service.js';
import { sanitizeSearchTerm } from '../../utils/sanitize.js';
import { HttpError } from '../../utils/httpErrors.js';

type ViewRow = {
  id: string;
  adresse: string;
  quartier: string | null;
  prix: number | null;
  taille: string | null;
  electromenagers: string | null;
  notes: string | null;
  statut: string;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
  approved_image_count: number;
  approved_media_count: number;
};

function applyFilters(query: any, params: PublicListingsQuery) {
  let q = query;
  if (params.q) {
    const s = sanitizeSearchTerm(params.q);
    if (s) q = q.or(`adresse.ilike.%${s}%,quartier.ilike.%${s}%,notes.ilike.%${s}%`);
  }
  if (params.quartier) q = q.eq('quartier', params.quartier);
  if (params.taille) q = q.eq('taille', params.taille);
  if (params.prixMax) q = q.or(`prix.is.null,prix.lte.${params.prixMax}`);
  return q;
}

async function attachThumbnails(rows: ViewRow[]): Promise<PublicListing[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: mediaRows } = await supabaseAdmin
    .from('listing_media')
    .select('id,listing_id,object_key,original_filename,type')
    .in('listing_id', ids)
    .eq('status', 'approved')
    .not('upload_completed_at', 'is', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const firstByListing = new Map<
    string,
    { object_key: string; original_filename: string; type: 'image' | 'video' }
  >();
  for (const m of mediaRows ?? []) {
    if (!firstByListing.has(m.listing_id)) {
      firstByListing.set(m.listing_id, {
        object_key: m.object_key,
        original_filename: m.original_filename,
        type: m.type as 'image' | 'video',
      });
    }
  }

  const thumbUrls = new Map<string, { url: string; type: 'image' | 'video' }>();
  await Promise.all(
    [...firstByListing.entries()].map(async ([listingId, media]) => {
      const url = await resolveViewUrl(media.object_key, media.original_filename);
      thumbUrls.set(listingId, { url, type: media.type });
    }),
  );

  return rows.map((r) => {
    const thumb = thumbUrls.get(r.id);
    return {
      id: r.id,
      adresse: r.adresse,
      quartier: r.quartier,
      prix: r.prix,
      taille: r.taille,
      electromenagers: r.electromenagers,
      notes: r.notes,
      statut: r.statut,
      latitude: r.latitude,
      longitude: r.longitude,
      approvedImageCount: r.approved_image_count ?? 0,
      approvedMediaCount: r.approved_media_count ?? 0,
      thumbnailUrl: thumb?.url ?? null,
      thumbnailType: thumb?.type ?? null,
    };
  });
}

function toPublicListing(
  r: ViewRow,
  thumbnail: { url: string; type: 'image' | 'video' } | null,
): PublicListing {
  return {
    id: r.id,
    adresse: r.adresse,
    quartier: r.quartier,
    prix: r.prix,
    taille: r.taille,
    electromenagers: r.electromenagers,
    notes: r.notes,
    statut: r.statut,
    latitude: r.latitude,
    longitude: r.longitude,
    approvedImageCount: r.approved_image_count ?? 0,
    approvedMediaCount: r.approved_media_count ?? 0,
    thumbnailUrl: thumbnail?.url ?? null,
    thumbnailType: thumbnail?.type ?? null,
  };
}

export async function listPublicListings(params: PublicListingsQuery) {
  const from = (params.page - 1) * params.pageSize;
  let query = supabaseAdmin
    .from('public_available_listings')
    .select('*', { count: 'exact' })
    .order('approved_media_count', { ascending: false })
    .order('approved_image_count', { ascending: false })
    .order('adresse', { ascending: true })
    .range(from, from + params.pageSize - 1);

  query = applyFilters(query, params);

  const { data, error, count } = await query;
  if (error) throw error;

  const items = await attachThumbnails((data ?? []) as ViewRow[]);
  return { items, page: params.page, pageSize: params.pageSize, total: count ?? 0 };
}

export async function getPublicListingById(id: string): Promise<PublicListingDetail> {
  const { data, error } = await supabaseAdmin
    .from('public_available_listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new HttpError(404, 'LISTING_NOT_AVAILABLE', "Ce logement n'est plus disponible");
  }

  const row = data as ViewRow;
  const { data: mediaRows } = await supabaseAdmin
    .from('listing_media')
    .select('id,type,object_key,original_filename,sort_order,created_at')
    .eq('listing_id', id)
    .eq('status', 'approved')
    .not('upload_completed_at', 'is', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const media: PublicMediaItem[] = await Promise.all(
    (mediaRows ?? []).map(async (m) => ({
      id: m.id,
      type: m.type as 'image' | 'video',
      viewUrl: await resolveViewUrl(m.object_key, m.original_filename),
      originalFilename: m.original_filename,
    })),
  );

  const thumbnail = media[0]
    ? { url: media[0].viewUrl, type: media[0].type }
    : null;

  return {
    ...toPublicListing(row, thumbnail),
    media,
  };
}

export async function listMapListings(params: Omit<PublicListingsQuery, 'page' | 'pageSize'>) {
  let query = supabaseAdmin
    .from('public_available_listings')
    .select('id,adresse,quartier,prix,latitude,longitude')
    .limit(MAP_RESULT_CAP);

  query = applyFilters(query, { ...params, page: 1, pageSize: MAP_RESULT_CAP });

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as MapListing[];
}

export async function getPublicStats(): Promise<PublicStats> {
  const { count: totalListings, error: totalErr } = await supabaseAdmin
    .from('logements')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (totalErr) throw totalErr;

  const { count: availableListings, error: availErr } = await supabaseAdmin
    .from('public_available_listings')
    .select('id', { count: 'exact', head: true });

  if (availErr) throw availErr;

  const { data: quartierRows, error: qErr } = await supabaseAdmin
    .from('public_available_listings')
    .select('quartier');

  if (qErr) throw qErr;

  const quartiers = new Set(
    (quartierRows ?? []).map((r) => r.quartier).filter(Boolean) as string[],
  );

  return {
    totalListings: totalListings ?? 0,
    availableListings: availableListings ?? 0,
    quartierCount: quartiers.size,
  };
}

export async function getQuartierCounts(): Promise<QuartierCount[]> {
  const { data, error } = await supabaseAdmin
    .from('public_available_listings')
    .select('quartier');

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.quartier) continue;
    counts.set(row.quartier, (counts.get(row.quartier) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([quartier, count]) => ({ quartier, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getMediaDownloadUrl(mediaId: string) {
  const { data: media, error } = await supabaseAdmin
    .from('listing_media')
    .select('id,status,object_key,original_filename,listing_id,upload_completed_at')
    .eq('id', mediaId)
    .maybeSingle();

  if (error) throw error;
  if (!media || media.status !== 'approved' || !media.upload_completed_at) {
    throw new HttpError(404, 'NOT_FOUND', 'Média introuvable');
  }

  const { data: listing } = await supabaseAdmin
    .from('logements')
    .select('deleted_at')
    .eq('id', media.listing_id)
    .maybeSingle();

  if (!listing || listing.deleted_at) {
    throw new HttpError(404, 'NOT_FOUND', 'Média introuvable');
  }

  const url = await resolveDownloadUrl(media.object_key, media.original_filename);
  return { url, expiresInSeconds: 300 };
}

export async function servePublicMediaObject(objectKey: string, inline: boolean) {
  if (!objectKey || !(await localObjectExists(objectKey))) {
    throw new HttpError(404, 'NOT_FOUND', 'Média introuvable');
  }

  const { data: media, error } = await supabaseAdmin
    .from('listing_media')
    .select('status,mime_type,upload_completed_at,original_filename,listing_id')
    .eq('object_key', objectKey)
    .maybeSingle();

  if (error) throw error;
  if (!media?.upload_completed_at || media.status !== 'approved') {
    throw new HttpError(404, 'NOT_FOUND', 'Média introuvable');
  }

  const { data: listing } = await supabaseAdmin
    .from('logements')
    .select('deleted_at')
    .eq('id', media.listing_id)
    .maybeSingle();

  if (!listing || listing.deleted_at) {
    throw new HttpError(404, 'NOT_FOUND', 'Média introuvable');
  }

  return {
    stream: openLocalObject(objectKey),
    mimeType: media.mime_type ?? 'application/octet-stream',
    filename: media.original_filename,
    inline,
  };
}
