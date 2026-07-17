import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { env } from './env.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts:
    env.NODE_ENV === 'production'
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export function permissionsPolicy(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  next();
}
