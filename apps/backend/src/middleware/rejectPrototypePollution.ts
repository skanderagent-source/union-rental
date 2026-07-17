import type { Request, Response, NextFunction } from 'express';
import { containsPollutionKeys } from '../utils/sanitize.js';
import { logSecurityEvent } from '../utils/securityEvents.js';

export function rejectPrototypePollution(req: Request, res: Response, next: NextFunction) {
  if (containsPollutionKeys(req.body)) {
    logSecurityEvent('prototype_pollution_blocked', req);
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
      },
    });
  }
  next();
}
