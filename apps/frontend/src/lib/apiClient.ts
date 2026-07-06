import { env } from './env';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
