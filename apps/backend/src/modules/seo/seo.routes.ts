import { Router } from 'express';
import { listingIdParamSchema } from '@union-rental/shared';
import { validateRequest } from '../../middleware/validateRequest.js';
import { HttpError } from '../../utils/httpErrors.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { buildRobotsTxt, buildSitemapPayload } from './seo.service.js';
import {
  getPublicListingStatus,
  listingStatusHttpCode,
} from './listingStatus.service.js';

export const seoRouter = Router();

const SITEMAP_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
const ROBOTS_CACHE = 'public, max-age=3600, s-maxage=3600';

seoRouter.get(
  '/listing/:id/status',
  validateRequest(listingIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams as { id: string };
    const status = await getPublicListingStatus(id);
    res.status(listingStatusHttpCode(status)).json({ data: { status } });
  }),
);

seoRouter.get(
  '/robots.txt',
  asyncHandler(async (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', ROBOTS_CACHE);
    res.send(buildRobotsTxt());
  }),
);

seoRouter.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const payload = await buildSitemapPayload();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', SITEMAP_CACHE);
    res.send(payload.xml);
  }),
);

seoRouter.get(
  '/sitemap-:part.xml',
  asyncHandler(async (req, res) => {
    const part = Number.parseInt(String(req.params.part), 10);
    if (!Number.isFinite(part) || part < 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid sitemap part');
    }

    try {
      const payload = await buildSitemapPayload(part);
      if (payload.kind !== 'urlset') {
        throw new HttpError(404, 'NOT_FOUND', 'Sitemap part introuvable');
      }
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', SITEMAP_CACHE);
      res.send(payload.xml);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sitemap part not found') {
        throw new HttpError(404, 'NOT_FOUND', 'Sitemap part introuvable');
      }
      throw error;
    }
  }),
);
