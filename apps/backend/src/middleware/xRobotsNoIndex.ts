import { NextFunction, Request, Response } from 'express';

const NOINDEX_HEADER = 'noindex, nofollow, noarchive';

/** Prevent JSON/API and health responses from being indexed as documents. */
export function xRobotsNoIndex(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', NOINDEX_HEADER);
  next();
}
