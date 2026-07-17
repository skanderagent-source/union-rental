import type { ApiRequestOptions } from './apiClient';
import { api } from './apiClient';
import type { z } from 'zod';

export class ApiValidationError extends Error {
  code = 'INVALID_API_RESPONSE';

  constructor() {
    super('Réponse serveur invalide');
    this.name = 'ApiValidationError';
  }
}

/** Runtime validation at the API trust boundary — types alone are not enough for JSON. */
export function parseApiData<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiValidationError();
  }
  return result.data;
}

export async function getValidated<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  const data = await api.get<unknown>(path, options);
  return parseApiData(schema, data);
}

export async function postValidated<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  const data = await api.post<unknown>(path, body, options);
  return parseApiData(schema, data);
}
