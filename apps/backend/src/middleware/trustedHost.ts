import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { getTrustedHosts, isTrustedHost } from '../utils/trustedHosts.js';
import { logSecurityEvent } from '../utils/securityEvents.js';

const trustedHosts = getTrustedHosts();

export function trustedHost(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  if (isTrustedHost(req.headers.host, trustedHosts)) {
    return next();
  }

  logSecurityEvent('invalid_host', req, { host: req.headers.host });
  return res.status(421).json({
    error: { code: 'INVALID_HOST', message: 'Hôte non autorisé' },
  });
}
