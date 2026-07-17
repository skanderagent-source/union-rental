import type { Request } from 'express';
import { logger } from '../config/logger.js';

export function logSecurityEvent(
  event: string,
  req?: Pick<Request, 'method' | 'originalUrl' | 'ip'> & { id?: Request['id'] },
  extra?: Record<string, unknown>,
) {
  logger.warn(
    {
      securityEvent: event,
      requestId: req?.id,
      method: req?.method,
      path: req?.originalUrl,
      ip: req?.ip,
      ...extra,
    },
    `Security event: ${event}`,
  );
}
