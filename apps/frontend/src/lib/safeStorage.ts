import {
  isValidListingId,
  LANG_STORAGE_KEY,
  REF_EXPIRY_MS,
  REF_STORAGE_KEY,
} from '@union-rental/shared';
import type { Lang } from '@/i18n';

const ALLOWED_KEYS = new Set<string>([LANG_STORAGE_KEY, REF_STORAGE_KEY]);

/** Only read from an explicit allowlist of non-sensitive client keys. */
export function readAllowedStorageKey(key: string): string | null {
  if (!ALLOWED_KEYS.has(key)) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeAllowedStorageKey(key: string, value: string): void {
  if (!ALLOWED_KEYS.has(key)) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function removeAllowedStorageKey(key: string): void {
  if (!ALLOWED_KEYS.has(key)) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readStoredLang(): Lang {
  const stored = readAllowedStorageKey(LANG_STORAGE_KEY);
  return stored === 'en' ? 'en' : 'fr';
}

export function readStoredReferralAgentId(): string | null {
  const raw = readAllowedStorageKey(REF_STORAGE_KEY);
  if (!raw) return null;

  try {
    const { id, ts } = JSON.parse(raw) as { id?: string; ts?: number };
    if (!id || !isValidListingId(id) || Date.now() - (ts ?? 0) > REF_EXPIRY_MS) {
      removeAllowedStorageKey(REF_STORAGE_KEY);
      return null;
    }
    return id;
  } catch {
    removeAllowedStorageKey(REF_STORAGE_KEY);
    return null;
  }
}

export function writeStoredReferralAgentId(agentId: string): void {
  if (!isValidListingId(agentId)) return;
  writeAllowedStorageKey(REF_STORAGE_KEY, JSON.stringify({ id: agentId, ts: Date.now() }));
}
