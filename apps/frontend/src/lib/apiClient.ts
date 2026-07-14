import { env } from './env';

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw Object.assign(new Error('Le serveur met trop de temps à répondre'), {
        code: 'REQUEST_TIMEOUT',
        status: 0,
      });
    }
    throw error;
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
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
};
