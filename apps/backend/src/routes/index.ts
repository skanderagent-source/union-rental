import { Router } from 'express';
import {
  publicListingsQuerySchema,
  publicListingsMapQuerySchema,
  createLeadSchema,
  listingIdParamSchema,
  mediaIdParamSchema,
  referralSlugParamSchema,
  mediaObjectQuerySchema,
} from '@union-rental/shared';
import { leadsLimiter } from '../config/rateLimits.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listPublicListings,
  getPublicListingById,
  listMapListings,
  getPublicStats,
  getQuartierCounts,
  getMediaDownloadUrl,
  servePublicMediaObject,
} from '../modules/listings/listings.service.js';
import { createPublicLead } from '../modules/leads/leads.service.js';
import { resolveReferralSlug } from '../modules/referral/referral.service.js';
import type { PublicListingsQuery } from '@union-rental/shared';

export const listingsRouter = Router();

listingsRouter.get(
  '/referral/:slug',
  validateRequest(referralSlugParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { slug } = req.validatedParams as { slug: string };
    const data = await resolveReferralSlug(slug);
    res.json({ data });
  }),
);

listingsRouter.get(
  '/listings',
  validateRequest(publicListingsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = req.validatedQuery as PublicListingsQuery;
    const data = await listPublicListings(params);
    res.json({ data });
  }),
);

listingsRouter.get(
  '/listings/map',
  validateRequest(publicListingsMapQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = req.validatedQuery as Omit<PublicListingsQuery, 'page' | 'pageSize'>;
    const data = await listMapListings(params);
    res.json({ data });
  }),
);

listingsRouter.get(
  '/listings/:id',
  validateRequest(listingIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams as { id: string };
    const data = await getPublicListingById(id);
    res.json({ data });
  }),
);

listingsRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const data = await getPublicStats();
    res.json({ data });
  }),
);

listingsRouter.get(
  '/quartiers',
  asyncHandler(async (_req, res) => {
    const data = await getQuartierCounts();
    res.json({ data });
  }),
);

listingsRouter.get(
  '/media/object',
  validateRequest(mediaObjectQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { key, inline } = req.validatedQuery as { key: string; inline?: '0' | '1' };
    const serveInline = inline !== '0';
    const { stream, mimeType, filename, inline: inlineDisposition } = await servePublicMediaObject(
      key,
      serveInline,
    );
    const safe = filename.replace(/[^\w.\- ]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      inlineDisposition ? 'inline' : `attachment; filename="${safe}"`,
    );
    stream.pipe(res);
  }),
);

listingsRouter.get(
  '/media/:mediaId/download-url',
  validateRequest(mediaIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { mediaId } = req.validatedParams as { mediaId: string };
    const data = await getMediaDownloadUrl(mediaId);
    res.json({ data });
  }),
);

export const leadsRouter = Router();

leadsRouter.use(leadsLimiter);

leadsRouter.post(
  '/leads',
  validateRequest(createLeadSchema),
  asyncHandler(async (req, res) => {
    const data = await createPublicLead(req.body, req);
    res.status(201).json({ data });
  }),
);
