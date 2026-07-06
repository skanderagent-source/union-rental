import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { listingsRouter, leadsRouter } from './routes/index.js';

export const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: false,
  }),
);

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ logger }));

const readsLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_READS_WINDOW_MS,
  max: env.RATE_LIMIT_READS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const leadsLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LEADS_WINDOW_MS,
  max: env.RATE_LIMIT_LEADS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/public', readsLimiter, listingsRouter);
app.use('/api/public', leadsLimiter, leadsRouter);

app.use(errorHandler);
