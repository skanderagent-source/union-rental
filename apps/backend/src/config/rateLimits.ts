import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from './env.js';
import { logSecurityEvent } from '../utils/securityEvents.js';

function retryAfterSeconds(req: Request, windowMs: number): number {
  const resetTime = req.rateLimit?.resetTime;
  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  }
  return Math.max(1, Math.ceil(windowMs / 1000));
}

function rateLimitJson(message: string, event: string, windowMs: number) {
  return (req: Request, res: Response) => {
    logSecurityEvent(event, req);
    res.setHeader('Retry-After', String(retryAfterSeconds(req, windowMs)));
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message },
    });
  };
}

export const readsLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_READS_WINDOW_MS,
  max: env.RATE_LIMIT_READS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJson(
    'Trop de requêtes. Réessayez plus tard.',
    'rate_limit_reads',
    env.RATE_LIMIT_READS_WINDOW_MS,
  ),
});

export const leadsLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LEADS_WINDOW_MS,
  max: env.RATE_LIMIT_LEADS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJson(
    'Trop de demandes envoyées. Réessayez plus tard.',
    'rate_limit_leads',
    env.RATE_LIMIT_LEADS_WINDOW_MS,
  ),
});

export const telemetryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJson(
    'Trop de rapports de télémétrie. Réessayez plus tard.',
    'rate_limit_telemetry',
    60 * 60 * 1000,
  ),
});
