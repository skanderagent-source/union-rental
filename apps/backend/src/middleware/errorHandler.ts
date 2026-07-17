import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { HttpError } from '../utils/httpErrors.js';
import { serializeErrorForLog } from '../utils/logRedaction.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.status < 500 && err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  logger.error(
    {
      err: serializeErrorForLog(err),
      requestId: req.id,
      path: req.originalUrl,
      method: req.method,
    },
    'Unhandled error',
  );

  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Erreur serveur' },
  });
}
