import { REF_EXPIRY_MS, REF_STORAGE_KEY } from '@union-rental/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function captureReferralFromSearch(search: URLSearchParams): {
  ref: string | null;
  listing: string | null;
} {
  const ref = search.get('ref');
  const listing = search.get('listing');
  if (ref && UUID_RE.test(ref)) {
    try {
      localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ id: ref, ts: Date.now() }));
    } catch {
      /* ignore */
    }
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
