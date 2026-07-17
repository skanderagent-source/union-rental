import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.body.nom',
      'req.body.telephone',
      'req.body.email',
      'req.body.message',
      'req.body.hp',
      'SUPABASE_SERVICE_ROLE_KEY',
      'R2_SECRET_ACCESS_KEY',
      'RESEND_API_KEY',
      'to',
      'email',
      'telephone',
      'err.config.headers',
      'err.config.data',
      'error.config',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: (err) => {
      if (!(err instanceof Error)) return err;
      return {
        type: err.name,
        message: err.message,
        ...(env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
      };
    },
  },
});
