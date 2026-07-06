import { Router } from 'express';
import { publicListingsQuerySchema, createLeadSchema } from '@union-rental/shared';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listPublicListings,
  getPublicListingById,
  listMapListings,
  getPublicStats,
  getQuartierCounts,
  getMediaDownloadUrl,
} from '../modules/listings/listings.service.js';
import { createPublicLead } from '../modules/leads/leads.service.js';
import type { PublicListingsQuery } from '@union-rental/shared';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export const listingsRouter = Router();

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
  validateRequest(publicListingsQuerySchema.omit({ page: true, pageSize: true }), 'query'),
  asyncHandler(async (req, res) => {
    const params = req.validatedQuery as Omit<PublicListingsQuery, 'page' | 'pageSize'>;
    const data = await listMapListings(params);
    res.json({ data });
  }),
);

listingsRouter.get(
  '/listings/:id',
  asyncHandler(async (req, res) => {
    const data = await getPublicListingById(routeParam(req.params.id));
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
  '/media/:mediaId/download-url',
  asyncHandler(async (req, res) => {
    const data = await getMediaDownloadUrl(routeParam(req.params.mediaId));
    res.json({ data });
  }),
);

export const leadsRouter = Router();

leadsRouter.post(
  '/leads',
  validateRequest(createLeadSchema),
  asyncHandler(async (req, res) => {
    const data = await createPublicLead(req.body);
    res.status(201).json({ data });
  }),
);
