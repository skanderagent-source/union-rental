import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env.js';
import { readsLimiter } from './config/rateLimits.js';
import { httpLogger } from './config/httpLogger.js';
import { helmetMiddleware, permissionsPolicy } from './config/helmet.js';
import { errorHandler } from './middleware/errorHandler.js';
import { enforceHttps } from './middleware/enforceHttps.js';
import { httpMethodGuard } from './middleware/httpMethodGuard.js';
import { rejectPollutedQuery } from './middleware/rejectPollutedQuery.js';
import { rejectPrototypePollution } from './middleware/rejectPrototypePollution.js';
import { requestNormalization } from './middleware/requestNormalization.js';
import { requestTimeout } from './middleware/requestTimeout.js';
import { requireJsonContentType } from './middleware/requireJsonContentType.js';
import { rejectRequestContentEncoding } from './middleware/rejectRequestContentEncoding.js';
import { trustedHost } from './middleware/trustedHost.js';
import { apiCacheControl } from './middleware/apiCacheControl.js';
import { xRobotsNoIndex } from './middleware/xRobotsNoIndex.js';
import { listingsRouter, leadsRouter } from './routes/index.js';
import { seoRouter } from './modules/seo/seo.routes.js';
import { telemetryRouter } from './modules/telemetry/telemetry.routes.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

app.use(requestNormalization);
app.use(enforceHttps);
app.use(trustedHost);
app.use(httpMethodGuard);
app.use(requestTimeout(env.HTTP_REQUEST_TIMEOUT_MS));
app.use(helmetMiddleware);
app.use(permissionsPolicy);

const frontendOrigins = env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: frontendOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86_400,
  }),
);

app.use(compression());
app.use(rejectPollutedQuery);
app.use(rejectRequestContentEncoding);
app.use(requireJsonContentType);
app.use(
  express.json({
    limit: env.JSON_BODY_LIMIT,
    strict: true,
    type: ['application/json', 'application/*+json'],
  }),
);
app.use(rejectPrototypePollution);
app.use(httpLogger);

app.get('/health', xRobotsNoIndex, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
});

app.use('/seo', xRobotsNoIndex, seoRouter);

app.use('/api/public', xRobotsNoIndex, apiCacheControl);
app.use('/api/public', telemetryRouter);
app.use('/api/public', readsLimiter, listingsRouter);
app.use('/api/public', leadsRouter);

app.use(xRobotsNoIndex, (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route introuvable' },
  });
});

app.use(errorHandler);
