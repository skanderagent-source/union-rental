import {
  ALLOWED_LISTING_SIZE_FILTERS,
  MAX_INVENTORY_PAGE,
  MIN_SEARCH_QUERY_LENGTH,
} from '@union-rental/shared';

const MAX_Q = 120;
const MAX_QUARTIER = 80;
const MAX_PRIX = 100_000;

export type InventoryFilters = {
  q: string;
  quartier: string;
  taille: string;
  prixMax: string;
  page: number;
  vue: 'grille' | 'carte';
};

/** Normalize untrusted URL search params before they drive API calls or UI state. */
export function parseInventoryFilters(params: URLSearchParams): InventoryFilters {
  const rawQ = (params.get('q') ?? '').trim().slice(0, MAX_Q);
  const q = rawQ.length >= MIN_SEARCH_QUERY_LENGTH ? rawQ : '';

  const quartier = (params.get('quartier') ?? '').trim().slice(0, MAX_QUARTIER);

  const tailleRaw = params.get('taille') ?? '';
  const taille = (ALLOWED_LISTING_SIZE_FILTERS as readonly string[]).includes(tailleRaw)
    ? tailleRaw
    : '';

  const prixRaw = Number.parseInt(params.get('prixMax') ?? '', 10);
  const prixMax =
    Number.isFinite(prixRaw) && prixRaw > 0 && prixRaw <= MAX_PRIX ? String(prixRaw) : '';

  const pageRaw = Number.parseInt(params.get('page') ?? '1', 10);
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, MAX_INVENTORY_PAGE) : 1;

  const vue = params.get('vue') === 'carte' ? 'carte' : 'grille';

  return { q, quartier, taille, prixMax, page, vue };
}
