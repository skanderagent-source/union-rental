import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

if (env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    logger.info(`Union Rental API listening on port ${env.PORT}`);
  });
}
