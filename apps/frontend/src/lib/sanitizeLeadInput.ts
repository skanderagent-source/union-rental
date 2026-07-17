/**
 * Client-side lead field normalization before JSON POST.
 * SQL injection / XSS are blocked server-side (parameterized DB queries, Zod, React escaping);
 * this layer strips control characters and constrains input shapes for defense in depth.
 */

const CONTROL_AND_ANGLE = /[\u0000-\u001f\u007f<>]/g;
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function sanitizePersonName(value: string, maxLen = 120): string {
  return value
    .replace(/[^\p{L}\p{M}\s'.-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLen);
}

export function sanitizePhoneInput(value: string, maxLen = 30): string {
  return value.replace(/[^\d+\s().-]/g, '').slice(0, maxLen);
}

/** Submit phone as digits with optional leading + — matches backend digit-count refine. */
export function sanitizePhoneForSubmit(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  const normalized = hasPlus ? `+${digits}` : digits;
  return normalized.slice(0, 30);
}

export function sanitizeEmail(value: string, maxLen = 120): string {
  return value.trim().toLowerCase().replace(CONTROL_AND_ANGLE, '').slice(0, maxLen);
}

export function sanitizeMessage(value: string, maxLen = 2000): string {
  return value.replace(MESSAGE_CONTROL, '').trim().slice(0, maxLen);
}

/** Live input — preserve trailing spaces while typing. */
export function sanitizeMessageInput(value: string, maxLen = 2000): string {
  return value.replace(MESSAGE_CONTROL, '').slice(0, maxLen);
}

export function sanitizeDigits(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

export function sanitizeDateField(value: string): string | null {
  const trimmed = value.trim().slice(0, 60);
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseBoundedInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.trunc(n);
}

/** Normalize merged lead body immediately before shared Zod validation. */
export function prepareLeadBody(raw: Record<string, unknown>): Record<string, unknown> {
  const typeDemande = raw.typeDemande;
  const base: Record<string, unknown> = {
    typeDemande,
    listingId: raw.listingId ?? null,
    refAgentId: raw.refAgentId ?? null,
    lang: raw.lang ?? 'fr',
    hp: String(raw.hp ?? '').slice(0, 200),
    nom: sanitizePersonName(String(raw.nom ?? '')),
    telephone: sanitizePhoneForSubmit(String(raw.telephone ?? '')),
    email: raw.email ? sanitizeEmail(String(raw.email)) : null,
    message: raw.message ? sanitizeMessage(String(raw.message)) : null,
  };

  if (typeDemande === 'prequal') {
    return {
      ...base,
      email: sanitizeEmail(String(raw.email ?? '')),
      revenuMensuel: parseBoundedInt(raw.revenuMensuel, 0, 1_000_000),
      scoreCredit: parseBoundedInt(raw.scoreCredit, 300, 900),
      dossierTal: raw.dossierTal === true,
      dateDemenagement: sanitizeDateField(String(raw.dateDemenagement ?? '')),
    };
  }

  return base;
}
