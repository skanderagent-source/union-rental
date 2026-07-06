const required = ['VITE_API_BASE_URL', 'VITE_SITE_URL'] as const;

function readEnv(): Record<(typeof required)[number], string> {
  const out = {} as Record<(typeof required)[number], string>;
  for (const key of required) {
    const value = import.meta.env[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    out[key] = value;
  }
  return out;
}

export const env = readEnv();
