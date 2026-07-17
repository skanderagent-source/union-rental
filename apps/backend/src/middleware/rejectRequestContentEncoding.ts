import type { Request, Response, NextFunction } from 'express';

/** Reject compressed request bodies — JSON API accepts plain UTF-8 only. */
export function rejectRequestContentEncoding(req: Request, res: Response, next: NextFunction) {
  const encoding = req.headers['content-encoding'];
  if (encoding && encoding.trim().toLowerCase() !== 'identity') {
    return res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Request Content-Encoding is not supported',
      },
    });
  }

  next();
}
