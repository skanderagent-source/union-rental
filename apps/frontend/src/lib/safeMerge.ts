const POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function hasPollutionKey(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).some((key) => POLLUTION_KEYS.has(key));
}

/** Merge plain objects without copying prototype-pollution keys from untrusted sources. */
export function safePlainMerge<T extends Record<string, unknown>>(
  ...sources: Array<Record<string, unknown> | undefined>
): T {
  const out: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) continue;
    if (hasPollutionKey(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (POLLUTION_KEYS.has(key)) continue;
      out[key] = value;
    }
  }
  return out as T;
}
