import type { Request, Response, NextFunction } from 'express';

export function requestTimeout(timeoutMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: { code: 'REQUEST_TIMEOUT', message: 'La requête a expiré' },
        });
      }
    });
    next();
  };
}
