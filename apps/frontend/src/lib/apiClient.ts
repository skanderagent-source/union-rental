import { env } from './env';

const REQUEST_TIMEOUT_MS = 15_000;

export type ApiRequestOptions = {
  /** React Query passes this on unmount — in-flight reads are cancelled, not on tab blur. */
  signal?: AbortSignal;
};

function linkSignals(timeoutController: AbortController, external?: AbortSignal): void {
  if (!external) return;
  if (external.aborted) {
    timeoutController.abort();
    return;
  }
  external.addEventListener('abort', () => timeoutController.abort(), { once: true });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, REQUEST_TIMEOUT_MS);
  linkSignals(timeoutController, options.signal);

  let res: Response;
  try {
    res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutController.signal,
      // No cookie auth in this app — CSRF tokens are not used (backend CORS credentials: false).
      credentials: 'omit',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timedOut) {
        throw Object.assign(new Error('Le serveur met trop de temps à répondre'), {
          code: 'REQUEST_TIMEOUT',
          status: 0,
        });
      }
      throw error;
    }
    throw Object.assign(new Error('Erreur réseau'), { code: 'NETWORK_ERROR', status: 0 });
  } finally {
    clearTimeout(timeout);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(json?.error?.message ?? 'Erreur réseau'), {
      code: json?.error?.code,
      status: res.status,
    });
  }
  return (json as { data: T }).data;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('POST', path, body, options),
};
