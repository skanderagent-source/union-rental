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
import { signViewUrl, signDownloadUrl } from '../media/r2.service.js';
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
    .select('id,listing_id,object_key,original_filename')
    .in('listing_id', ids)
    .eq('status', 'approved')
    .eq('type', 'image')
    .order('created_at', { ascending: true });

  const firstByListing = new Map<string, { object_key: string; original_filename: string }>();
  for (const m of mediaRows ?? []) {
    if (!firstByListing.has(m.listing_id)) {
      firstByListing.set(m.listing_id, m);
    }
  }

  const thumbUrls = new Map<string, string>();
  await Promise.all(
    [...firstByListing.entries()].map(async ([listingId, media]) => {
      const url = await signViewUrl(media.object_key);
      thumbUrls.set(listingId, url);
    }),
  );

  return rows.map((r) => ({
    id: r.id,
    adresse: r.adresse,
    quartier: r.quartier,
    prix: r.prix,
    taille: r.taille,
    electromenagers: r.electromenagers,
    notes: r.notes,
    statut: r.statut,
    source: r.source,
    latitude: r.latitude,
    longitude: r.longitude,
    approvedImageCount: r.approved_image_count ?? 0,
    thumbnailUrl: thumbUrls.get(r.id) ?? null,
  }));
}

function toPublicListing(r: ViewRow, thumbnailUrl: string | null): PublicListing {
  return {
    id: r.id,
    adresse: r.adresse,
    quartier: r.quartier,
    prix: r.prix,
    taille: r.taille,
    electromenagers: r.electromenagers,
    notes: r.notes,
    statut: r.statut,
    source: r.source,
    latitude: r.latitude,
    longitude: r.longitude,
    approvedImageCount: r.approved_image_count ?? 0,
    thumbnailUrl,
  };
}

export async function listPublicListings(params: PublicListingsQuery) {
  const from = (params.page - 1) * params.pageSize;
  let query = supabaseAdmin
    .from('public_available_listings')
    .select('*', { count: 'exact' })
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
    .select('id,type,object_key,original_filename,created_at')
    .eq('listing_id', id)
    .eq('status', 'approved')
    .order('type', { ascending: true })
    .order('created_at', { ascending: true });

  const sorted = (mediaRows ?? []).sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === 'image' ? -1 : 1;
  });

  const media: PublicMediaItem[] = await Promise.all(
    sorted.map(async (m) => ({
      id: m.id,
      type: m.type as 'image' | 'video',
      viewUrl: await signViewUrl(m.object_key),
      originalFilename: m.original_filename,
    })),
  );

  const thumbnailUrl = media.find((m) => m.type === 'image')?.viewUrl ?? null;

  return {
    ...toPublicListing(row, thumbnailUrl),
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
    .select('id,status,object_key,original_filename,listing_id')
    .eq('id', mediaId)
    .maybeSingle();

  if (error) throw error;
  if (!media || media.status !== 'approved') {
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

  const url = await signDownloadUrl(media.object_key, media.original_filename);
  return { url, expiresInSeconds: 300 };
}
