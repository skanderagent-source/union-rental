const SECRET_KEY_PATTERN =
  /(key|secret|token|password|authorization|cookie|apikey|api_key|service_role)/i;

export function redactString(value: string): string {
  return value.replace(
    /([A-Za-z0-9+/=_-]{20,})/g,
    (match) => (match.length >= 32 ? '[REDACTED]' : match),
  );
}

export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((entry) => redactObject(entry, depth + 1));
  if (typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key) || ['nom', 'telephone', 'email', 'message'].includes(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = redactObject(entry, depth + 1);
  }
  return output;
}

export function serializeErrorForLog(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { value: redactObject(err) };
  }

  return {
    name: err.name,
    message: redactString(err.message),
    ...(err instanceof Error && 'code' in err ? { code: (err as Error & { code?: string }).code } : {}),
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  };
}
