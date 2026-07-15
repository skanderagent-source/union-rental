import { isValidReferralUsername } from '@union-rental/shared';
import { REF_EXPIRY_MS, REF_STORAGE_KEY } from '@union-rental/shared';
import { api } from './apiClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function persistReferralAgentId(agentId: string) {
  try {
    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ id: agentId, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export async function resolveReferralToken(token: string): Promise<string | null> {
  const trimmed = token.trim().toLowerCase();
  if (!trimmed || !isValidReferralUsername(trimmed)) return null;

  try {
    const { agentId } = await api.get<{ agentId: string }>(`/api/public/referral/${encodeURIComponent(trimmed)}`);
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

export function getActiveReferral(): string | null {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const { id, ts } = JSON.parse(raw) as { id?: string; ts?: number };
    if (!id || !UUID_RE.test(id) || Date.now() - (ts ?? 0) > REF_EXPIRY_MS) {
      localStorage.removeItem(REF_STORAGE_KEY);
      return null;
    }
    return id;
  } catch {
    return null;
  }
}
