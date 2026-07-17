import { z } from 'zod';
import {
  ALLOWED_LISTING_SIZE_FILTERS,
  MAX_LISTINGS_OFFSET,
  MAX_PAGE_SIZE,
  MIN_SEARCH_QUERY_LENGTH,
  REFERRAL_USERNAME_MAX_LENGTH,
  REFERRAL_USERNAME_MIN_LENGTH,
  REFERRAL_USERNAME_PATTERN,
  DEFAULT_PAGE_SIZE,
} from './constants.js';

const publicListingsQueryBaseSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => {
      if (!value || value.length < MIN_SEARCH_QUERY_LENGTH) return undefined;
      return value;
    }),
  quartier: z.string().trim().max(80).optional(),
  taille: z.enum(ALLOWED_LISTING_SIZE_FILTERS).optional(),
  prixMax: z.coerce.number().positive().max(100000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const publicListingsQuerySchema = publicListingsQueryBaseSchema.superRefine((query, ctx) => {
  const offset = (query.page - 1) * query.pageSize;
  if (offset >= MAX_LISTINGS_OFFSET) {
    ctx.addIssue({
      code: 'custom',
      path: ['page'],
      message: 'Page out of range',
    });
  }
});

export const publicListingsMapQuerySchema = publicListingsQueryBaseSchema.omit({
  page: true,
  pageSize: true,
});

export const listingIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const mediaIdParamSchema = z.object({
  mediaId: z.string().uuid(),
});

export const referralSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(REFERRAL_USERNAME_MIN_LENGTH)
    .max(REFERRAL_USERNAME_MAX_LENGTH)
    .regex(REFERRAL_USERNAME_PATTERN),
});

export const mediaObjectQuerySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => !value.includes('..') && !value.includes('\\'), 'Invalid media key'),
  inline: z.enum(['0', '1']).optional(),
});

export const createLeadSchema = z
  .object({
    typeDemande: z.enum(['rappel', 'prequal']),
    listingId: z.string().uuid().nullish(),
    nom: z.string().trim().min(1).max(120),
    telephone: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .refine((v) => v.replace(/\D/g, '').length >= 7, 'Téléphone invalide'),
    email: z.string().trim().email().max(120).nullish().or(z.literal('')),
    revenuMensuel: z.coerce.number().int().min(0).max(1000000).nullish(),
    scoreCredit: z.coerce.number().int().min(300).max(900).nullish(),
    dossierTal: z.boolean().nullish(),
    dateDemenagement: z.string().trim().max(60).nullish(),
    message: z.string().trim().max(2000).nullish(),
    refAgentId: z.string().uuid().nullish(),
    hp: z.string().max(200).optional().default(''),
    lang: z.enum(['fr', 'en']).optional().default('fr'),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.typeDemande === 'prequal') {
      if (!d.email) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email requis' });
      }
      if (d.revenuMensuel === null || d.revenuMensuel === undefined) {
        ctx.addIssue({ code: 'custom', path: ['revenuMensuel'], message: 'Revenu requis' });
      }
      if (d.scoreCredit === null || d.scoreCredit === undefined) {
        ctx.addIssue({ code: 'custom', path: ['scoreCredit'], message: 'Cote de crédit requise' });
      }
    }
  });

export const publicListingSchema = z.object({
  id: z.string().uuid(),
  adresse: z.string(),
  quartier: z.string().nullable(),
  prix: z.number().nullable(),
  taille: z.string().nullable(),
  electromenagers: z.string().nullable(),
  notes: z.string().nullable(),
  statut: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  approvedImageCount: z.number().int().min(0),
  approvedMediaCount: z.number().int().min(0),
  thumbnailUrl: z.string().nullable(),
  thumbnailType: z.enum(['image', 'video']).nullable(),
});

export const publicMediaItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['image', 'video']),
  viewUrl: z.string().url(),
  originalFilename: z.string(),
});

export const publicListingDetailSchema = publicListingSchema.extend({
  media: z.array(publicMediaItemSchema),
});

export const mapListingSchema = z.object({
  id: z.string().uuid(),
  adresse: z.string(),
  quartier: z.string().nullable(),
  prix: z.number().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const publicStatsSchema = z.object({
  totalListings: z.number().int().min(0),
  availableListings: z.number().int().min(0),
  quartierCount: z.number().int().min(0),
});

export const quartierCountSchema = z.object({
  quartier: z.string(),
  count: z.number().int().min(0),
});

export const referralAgentSchema = z.object({
  agentId: z.string().uuid(),
  nom: z.string(),
});

export const mediaDownloadUrlSchema = z.object({
  url: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});

export const createLeadResponseSchema = z.object({
  received: z.literal(true),
});

export const publicListingsPageSchema = z.object({
  items: z.array(publicListingSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const mapListingListSchema = z.array(mapListingSchema);

export const quartierCountListSchema = z.array(quartierCountSchema);

export const clientTelemetrySchema = z.object({
  kind: z.enum(['web-vital', 'client-error']),
  name: z.string().trim().min(1).max(40),
  pathname: z.string().trim().max(200),
  value: z.number().finite().nonnegative().optional(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  message: z.string().trim().max(500).optional(),
});

export type ClientTelemetryBody = z.infer<typeof clientTelemetrySchema>;

export type PublicListingsQuery = z.infer<typeof publicListingsQuerySchema>;
export type CreateLeadBody = z.infer<typeof createLeadSchema>;
