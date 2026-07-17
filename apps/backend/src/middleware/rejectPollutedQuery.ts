import type { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from '../utils/securityEvents.js';

export function rejectPollutedQuery(req: Request, res: Response, next: NextFunction) {
  for (const value of Object.values(req.query)) {
    if (Array.isArray(value)) {
      logSecurityEvent('query_pollution_blocked', req);
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Duplicate query parameter',
        },
      });
    }
  }
  next();
}
