import type { Request, Response, NextFunction } from 'express';

export function requireJsonContentType(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const contentType = req.headers['content-type'];
  if (!contentType?.toLowerCase().startsWith('application/json')) {
    return res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type application/json required',
      },
    });
  }

  next();
}
