import cron from 'node-cron';
import { env } from '../../config/env.js';
import { runGeocodeBackfill } from '../geocoding/geocoding.service.js';
import { logger } from '../../config/logger.js';

export function startCronJobs() {
  if (env.GEOCODE_BACKFILL_ENABLED) {
    cron.schedule(env.CRON_GEOCODE_BACKFILL, () => {
      void runGeocodeBackfill().catch((err) => logger.error({ err }, 'Geocode cron failed'));
    });
    logger.info('Geocode backfill cron scheduled');
  }
}
