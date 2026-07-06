import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startCronJobs } from './modules/jobs/geocodeBackfill.job.js';

if (env.NODE_ENV !== 'test') {
  startCronJobs();
  app.listen(env.PORT, () => {
    logger.info(`Union Rental API listening on port ${env.PORT}`);
  });
}
