import { createServer, type Server } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

let server: Server | undefined;

function shutdown(signal: string) {
  if (!server) return;

  logger.info({ signal }, 'Shutting down HTTP server');
  server.close((closeError) => {
    if (closeError) {
      logger.error({ err: closeError, signal }, 'Error during HTTP shutdown');
      process.exit(1);
      return;
    }
    logger.info({ signal }, 'HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error({ signal, graceMs: env.SHUTDOWN_GRACE_MS }, 'Forced shutdown after grace period');
    process.exit(1);
  }, env.SHUTDOWN_GRACE_MS).unref();
}

if (env.NODE_ENV !== 'test') {
  server = createServer(app);

  server.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = env.HTTP_HEADERS_TIMEOUT_MS;
  if ('requestTimeout' in server) {
    (server as Server & { requestTimeout: number }).requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
  }

  server.listen(env.PORT, () => {
    logger.info(
      {
        keepAliveTimeoutMs: env.HTTP_KEEP_ALIVE_TIMEOUT_MS,
        headersTimeoutMs: env.HTTP_HEADERS_TIMEOUT_MS,
        requestTimeoutMs: env.HTTP_REQUEST_TIMEOUT_MS,
        dbQueryTimeoutMs: env.DB_QUERY_TIMEOUT_MS,
      },
      `Union Rental API listening on port ${env.PORT}`,
    );
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export { server };
