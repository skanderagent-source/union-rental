import type { Request, Response, NextFunction } from 'express';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS', 'HEAD']);
const ALLOW_HEADER = 'GET, POST, OPTIONS, HEAD';

export function httpMethodGuard(req: Request, res: Response, next: NextFunction) {
  if (ALLOWED_METHODS.has(req.method)) {
    return next();
  }

  res.setHeader('Allow', ALLOW_HEADER);
  return res.status(405).json({
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Méthode non autorisée' },
  });
}
