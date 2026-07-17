import { env } from '../config/env.js';

export function getTrustedHosts(): Set<string> {
  const hosts = new Set<string>();
  const port = String(env.PORT);

  for (const loopback of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]) {
    hosts.add(loopback);
  }

  try {
    const apiUrl = new URL(env.PUBLIC_API_BASE_URL);
    hosts.add(apiUrl.host.toLowerCase());
    hosts.add(apiUrl.hostname.toLowerCase());
  } catch {
    // PUBLIC_API_BASE_URL is validated at startup.
  }

  if (env.TRUSTED_HOSTS) {
    for (const host of env.TRUSTED_HOSTS.split(',')) {
      const trimmed = host.trim().toLowerCase();
      if (trimmed) hosts.add(trimmed);
    }
  }

  return hosts;
}

export function isTrustedHost(hostHeader: string | undefined, trusted: Set<string>): boolean {
  if (!hostHeader) return false;

  const normalized = hostHeader.toLowerCase();
  if (trusted.has(normalized)) return true;

  const hostname = normalized.split(':')[0] ?? normalized;
  return trusted.has(hostname);
}
