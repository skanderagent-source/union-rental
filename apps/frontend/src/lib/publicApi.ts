import {
  createLeadResponseSchema,
  createLeadSchema,
  mapListingListSchema,
  publicListingDetailSchema,
  publicListingsPageSchema,
  publicStatsSchema,
  quartierCountListSchema,
  referralAgentSchema,
} from '@union-rental/shared';
import type { ApiRequestOptions } from './apiClient';
import { getValidated, postValidated } from './parseApi';

export const publicApi = {
  getStats: (options?: ApiRequestOptions) =>
    getValidated('/api/public/stats', publicStatsSchema, options),

  getListings: (queryString: string, options?: ApiRequestOptions) =>
    getValidated(`/api/public/listings?${queryString}`, publicListingsPageSchema, options),

  getMapListings: (queryString: string, options?: ApiRequestOptions) =>
    getValidated(`/api/public/listings/map?${queryString}`, mapListingListSchema, options),

  getQuartiers: (options?: ApiRequestOptions) =>
    getValidated('/api/public/quartiers', quartierCountListSchema, options),

  getListing: (id: string, options?: ApiRequestOptions) =>
    getValidated(`/api/public/listings/${id}`, publicListingDetailSchema, options),

  getReferral: (username: string, options?: ApiRequestOptions) =>
    getValidated(
      `/api/public/referral/${encodeURIComponent(username)}`,
      referralAgentSchema,
      options,
    ),

  postLead: (body: unknown, options?: ApiRequestOptions) =>
    postValidated('/api/public/leads', body, createLeadResponseSchema, options),
};

/** Client-side gate before submit — backend Zod remains the security boundary. */
export function validateLeadPayload(body: unknown) {
  return createLeadSchema.safeParse(body);
}
