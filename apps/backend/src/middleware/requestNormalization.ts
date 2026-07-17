import type { Request, Response, NextFunction } from 'express';

function hasAmbiguousPath(url: string): boolean {
  const pathOnly = url.split('?')[0] ?? url;
  const lower = pathOnly.toLowerCase();
  return (
    lower.includes('//') ||
    lower.includes('\\') ||
    lower.includes('%2f%2f') ||
    lower.includes('%5c') ||
    lower.includes('%2e%2e')
  );
}

export function requestNormalization(req: Request, res: Response, next: NextFunction) {
  if (hasAmbiguousPath(req.url)) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Requête invalide' },
    });
  }

  const transferEncoding = req.headers['transfer-encoding'];
  const contentLength = req.headers['content-length'];
  if (
    transferEncoding &&
    contentLength &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  ) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Requête ambiguë refusée' },
    });
  }

  next();
}
