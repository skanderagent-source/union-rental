import { logger } from '../config/logger.js';
import { HttpError } from './httpErrors.js';
import { serializeErrorForLog } from './logRedaction.js';

export function throwIfDatabaseError(error: { message?: string; code?: string } | null): void {
  if (!error) return;
  logger.error({ err: serializeErrorForLog(error) }, 'Database error');
  throw new HttpError(500, 'INTERNAL', 'Erreur serveur');
}
