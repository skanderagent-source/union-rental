import { Router } from 'express';
import { clientTelemetrySchema } from '@union-rental/shared';
import { telemetryLimiter } from '../../config/rateLimits.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../config/logger.js';

export const telemetryRouter = Router();

telemetryRouter.post(
  '/telemetry',
  telemetryLimiter,
  validateRequest(clientTelemetrySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      kind: 'web-vital' | 'client-error';
      name: string;
      pathname: string;
      value?: number;
      rating?: string;
      message?: string;
    };

    logger.info(
      {
        event: 'client_telemetry',
        kind: body.kind,
        metric: body.name,
        pathname: body.pathname,
        value: body.value,
        rating: body.rating,
        message: body.message,
      },
      'Client telemetry',
    );

    res.status(204).end();
  }),
);
