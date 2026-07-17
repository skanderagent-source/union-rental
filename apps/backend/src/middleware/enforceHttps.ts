import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV !== 'production') {
    return next();
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0]?.trim() : undefined;

  if (req.secure || proto === 'https') {
    return next();
  }

  const host = req.headers.host;
  if (!host) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Requête invalide' },
    });
  }

  const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
  if (!path.startsWith('/') || path.startsWith('//')) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Requête invalide' },
    });
  }

  return res.redirect(301, `https://${host}${req.originalUrl}`);
}
