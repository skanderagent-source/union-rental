export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%]/g, ' ').trim();
}

/** Escape `%` and `_` before embedding user text in PostgREST `ilike` filters. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

export function sanitizePublicText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = stripHtml(value);
  return cleaned.length > 0 ? cleaned : null;
}

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function containsPollutionKeys(value: unknown, depth = 0): boolean {
  if (depth > 8 || value == null) return false;
  if (typeof value !== 'object') return false;

  if (Array.isArray(value)) {
    return value.some((entry) => containsPollutionKeys(entry, depth + 1));
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (POLLUTION_KEYS.has(key)) return true;
    if (containsPollutionKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
  }

  return false;
}
