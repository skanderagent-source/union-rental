export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(message = 'Ressource introuvable'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', message, details);
}
