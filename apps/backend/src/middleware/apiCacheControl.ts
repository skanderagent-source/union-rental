import type { Request, Response, NextFunction } from 'express';

export function apiCacheControl(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
