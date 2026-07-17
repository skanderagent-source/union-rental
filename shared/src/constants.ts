export const QUARTIER_COORDS: Record<string, [number, number]> = {
  rosemont: [45.54, -73.58],
  'plateau-mont-royal': [45.525, -73.578],
  'côte-des-neiges': [45.488, -73.626],
  'cote-des-neiges': [45.488, -73.626],
  'st-michel': [45.578, -73.6],
  'saint-michel': [45.578, -73.6],
  'ahuntsic-cartierville': [45.556, -73.666],
  ahuntsic: [45.558, -73.646],
  outremont: [45.527, -73.609],
  villeray: [45.55, -73.607],
  'hochelaga-maisonneuve': [45.547, -73.543],
  hochelaga: [45.548, -73.544],
  'parc-extension': [45.528, -73.638],
  'parc ex': [45.528, -73.638],
  'st-laurent': [45.506, -73.704],
  'saint-laurent': [45.506, -73.704],
  laval: [45.57, -73.79],
  longueuil: [45.52, -73.472],
  'ville-marie': [45.518, -73.568],
  'montréal-nord': [45.59, -73.635],
  lachine: [45.432, -73.673],
  lasalle: [45.427, -73.632],
  verdun: [45.46, -73.573],
  'sud-ouest': [45.474, -73.6],
  westmount: [45.487, -73.59],
  dorval: [45.398, -73.762],
  'pointe-aux-trembles': [45.653, -73.494],
  anjou: [45.606, -73.558],
  'montréal-est': [45.622, -73.505],
  gatineau: [45.422, -75.718],
  boisbriand: [45.618, -73.836],
  'saint-eustache': [45.566, -73.902],
  'deux-montagnes': [45.552, -74.008],
  châteauguay: [45.382, -73.742],
  'greenfield park': [45.486, -73.478],
  'dollard-des-ormeaux': [45.478, -73.824],
  pierrefonds: [45.497, -73.852],
  'trois-rivières': [46.344, -72.546],
  viauville: [45.556, -73.548],
  'st-jérôme': [45.782, -74.002],
};

export const SIZE_LABELS: Record<string, string> = {
  '2.5': '2½',
  '3.5': '3½',
  '4.5': '4½',
  '5.5': '5½',
  '6.5': '6½',
  '7.5': '7½',
};

export const LISTING_STATUS_AVAILABLE = 'Available';

export const PUBLIC_LISTING_FIELDS = [
  'id',
  'adresse',
  'quartier',
  'prix',
  'taille',
  'electromenagers',
  'notes',
  'statut',
  'latitude',
  'longitude',
] as const;

export const LEAD_TYPES = ['rappel', 'prequal'] as const;

export const REF_STORAGE_KEY = 'ur_ref';
export const LANG_STORAGE_KEY = 'ur_lang';
export const REF_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export const REFERRAL_USERNAME_MIN_LENGTH = 3;
export const REFERRAL_USERNAME_MAX_LENGTH = 32;
export const REFERRAL_USERNAME_PATTERN = /^[a-z0-9]+$/;

export function slugifyFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, REFERRAL_USERNAME_MAX_LENGTH);
}

export function normalizeReferralUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function isValidReferralUsername(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length >= REFERRAL_USERNAME_MIN_LENGTH &&
    normalized.length <= REFERRAL_USERNAME_MAX_LENGTH &&
    REFERRAL_USERNAME_PATTERN.test(normalized)
  );
}

/** Username segment derived from agents.nom — must match agents.referral_slug. */
export function referralUsernameFromNom(nom: string | null | undefined): string | null {
  const username = normalizeReferralUsername(nom ?? '');
  return isValidReferralUsername(username) ? username : null;
}

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
export const MAX_LISTINGS_OFFSET = 10_000;
/** Cap absurd inventory pagination URLs to block crawl traps. */
export const MAX_INVENTORY_PAGE = 500;
export const MAP_RESULT_CAP = 2000;
/** Ignore single-character catalog searches to reduce expensive ilike scans. */
export const MIN_SEARCH_QUERY_LENGTH = 2;

export const LISTING_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ALLOWED_LISTING_SIZE_FILTERS = Object.keys(SIZE_LABELS) as [
  keyof typeof SIZE_LABELS,
  ...(keyof typeof SIZE_LABELS)[],
];

export function isValidListingId(value: string): boolean {
  return LISTING_ID_UUID_RE.test(value.trim());
}
