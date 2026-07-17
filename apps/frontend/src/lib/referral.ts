import { isValidReferralUsername } from '@union-rental/shared';
import { publicApi } from './publicApi';
import { writeStoredReferralAgentId } from './safeStorage';

export function persistReferralAgentId(agentId: string) {
  writeStoredReferralAgentId(agentId);
}

export async function resolveReferralToken(token: string): Promise<string | null> {
  const trimmed = token.trim().toLowerCase();
  if (!trimmed || !isValidReferralUsername(trimmed)) return null;

  try {
    const { agentId } = await publicApi.getReferral(trimmed);
    return agentId ?? null;
  } catch {
    return null;
  }
}

export async function captureReferralFromSearch(search: URLSearchParams): Promise<{
  ref: string | null;
  listing: string | null;
}> {
  const ref = search.get('ref');
  const listing = search.get('listing');
  if (ref) {
    const agentId = await resolveReferralToken(ref);
    if (agentId) persistReferralAgentId(agentId);
  }
  return { ref, listing };
}

export { readStoredReferralAgentId as getActiveReferral, removeAllowedStorageKey as clearStoredReferral } from './safeStorage';
export { REF_STORAGE_KEY } from '@union-rental/shared';
