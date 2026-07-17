/**
 * Client-exposed build-time variables (VITE_*) are public — never put secrets here.
 * Only non-sensitive configuration belongs in this module.
 */
import { assertSecureConfiguredUrl } from './safeUrl';

const required = ['VITE_API_BASE_URL', 'VITE_SITE_URL'] as const;

function readEnv(): Readonly<Record<(typeof required)[number], string>> {
  const out = {} as Record<(typeof required)[number], string>;
  for (const key of required) {
    const value = import.meta.env[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    assertSecureConfiguredUrl(key, value);
    out[key] = value;
  }
  return Object.freeze(out);
}

export const env = readEnv();
