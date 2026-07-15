export type ApiSuccess<T> = { data: T };

export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicListing = {
  id: string;
  adresse: string;
  quartier: string | null;
  prix: number | null;
  taille: string | null;
  electromenagers: string | null;
  notes: string | null;
  statut: string;
  latitude: number | null;
  longitude: number | null;
  approvedImageCount: number;
  approvedMediaCount: number;
  thumbnailUrl: string | null;
  thumbnailType: 'image' | 'video' | null;
};

export type PublicMediaItem = {
  id: string;
  type: 'image' | 'video';
  viewUrl: string;
  originalFilename: string;
};

export type PublicListingDetail = PublicListing & {
  media: PublicMediaItem[];
};

export type MapListing = {
  id: string;
  adresse: string;
  quartier: string | null;
  prix: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type PublicStats = {
  totalListings: number;
  availableListings: number;
  quartierCount: number;
};

export type QuartierCount = {
  quartier: string;
  count: number;
};

export type CreateLeadInput = {
  typeDemande: 'rappel' | 'prequal';
  listingId?: string | null;
  nom: string;
  telephone: string;
  email?: string | null;
  revenuMensuel?: number | null;
  scoreCredit?: number | null;
  dossierTal?: boolean | null;
  dateDemenagement?: string | null;
  message?: string | null;
  refAgentId?: string | null;
  hp?: string;
  lang?: 'fr' | 'en';
};
