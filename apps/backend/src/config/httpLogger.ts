import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId(req: Request, res: Response) {
    const incoming = req.headers['x-request-id'];
    if (typeof incoming === 'string' && incoming.trim()) {
      res.setHeader('X-Request-Id', incoming.trim());
      return incoming.trim();
    }
    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customProps: () => ({ service: 'union-rental-api' }),
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
