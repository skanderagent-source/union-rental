import type { ClientTelemetryBody } from '@union-rental/shared';
import { env } from '@/lib/env';

const TELEMETRY_PATH = '/api/public/telemetry';

function telemetryEndpoint(): string {
  return `${env.VITE_API_BASE_URL.replace(/\/$/, '')}${TELEMETRY_PATH}`;
}

/** Fire-and-forget client telemetry (Web Vitals + render errors). Production only. */
export function reportClientTelemetry(payload: ClientTelemetryBody): void {
  if (!import.meta.env.PROD) return;

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(telemetryEndpoint(), blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch(telemetryEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {
    /* monitoring must never break the app */
  });
}

export function reportClientError(name: string, message: string, pathname?: string): void {
  reportClientTelemetry({
    kind: 'client-error',
    name,
    pathname: pathname ?? window.location.pathname,
    message: message.slice(0, 500),
  });
}

export function initClientErrorMonitoring(): void {
  if (!import.meta.env.PROD) return;

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target !== document.documentElement) {
      const tag = target.tagName.toLowerCase();
      if (tag === 'img' || tag === 'link' || tag === 'script') {
        reportClientError(
          'resource_error',
          `${tag} failed: ${(target as HTMLImageElement).src || (target as HTMLLinkElement).href || tag}`,
        );
      }
      return;
    }

    reportClientError('window_error', event.message || 'Unknown script error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    reportClientError('unhandled_rejection', message);
  });
}
