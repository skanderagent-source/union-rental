const BLOCKED_SCHEMES = /^(javascript|vbscript|file):/i;
const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

type SafeUrlOptions = {
  /** Allow http:// for local dev hosts only. */
  allowLocalHttp?: boolean;
};

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(raw, 'https://localhost');
    } catch {
      return null;
    }
  }
}

/** Block dangerous schemes before assigning URLs to links, media, or fetch targets. */
export function isSafeUrl(raw: string, options: SafeUrlOptions = {}): boolean {
  const trimmed = raw.trim();
  if (!trimmed || BLOCKED_SCHEMES.test(trimmed)) return false;

  const parsed = parseUrl(trimmed);
  if (!parsed) return false;

  if (parsed.protocol === 'data:') return false;

  if (parsed.protocol === 'http:') {
    return options.allowLocalHttp === true && LOCAL_HTTP_HOSTS.has(parsed.hostname);
  }

  return parsed.protocol === 'https:';
}

/** Validate API/media URLs from server JSON before binding to img, video, or fetch. */
export function getSafeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return isSafeUrl(url, { allowLocalHttp: import.meta.env.DEV }) ? url : null;
}

/** Validate external hrefs (mailto excluded — use plain text for email). */
export function getSafeExternalHref(url: string | null | undefined): string | null {
  if (!url) return null;
  return isSafeUrl(url, { allowLocalHttp: import.meta.env.DEV }) ? url : null;
}

/** Fail fast when configured endpoints would cause mixed content in production. */
export function assertSecureConfiguredUrl(name: string, value: string): void {
  const parsed = parseUrl(value);
  if (!parsed) {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (parsed.protocol === 'http:') {
    if (!import.meta.env.DEV) {
      throw new Error(`${name} must use https:// in production`);
    }
    if (!LOCAL_HTTP_HOSTS.has(parsed.hostname)) {
      throw new Error(`${name} may use http:// only for localhost in development`);
    }
    return;
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${name} must use http:// or https://`);
  }
}
