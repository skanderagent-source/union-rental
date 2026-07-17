import { isProductionSiteUrl } from '@union-rental/shared';
import { env } from './env';

export function isClientSeoIndexingAllowed(): boolean {
  if (!import.meta.env.PROD) return false;
  const override = import.meta.env.VITE_SEO_ALLOW_INDEXING?.trim().toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  return isProductionSiteUrl(env.VITE_SITE_URL);
}
