const CRLF_PATTERN = /[\r\n\u2028\u2029\u0000-\u001f\u007f]/;

export function escHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

/** Prevent SMTP header injection in subject lines. */
export function escEmailSubject(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\u2028\u2029\u0000-\u001f\u007f]/g, ' ')
    .trim();
}

export function escPlainText(value: unknown): string {
  return escHtml(value).replace(/\s+/g, ' ').trim();
}

export function safeHttpHref(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return escHtml(parsed.href);
  } catch {
    return null;
  }
}

export function htmlEmailDocument(bodyHtml: string): string {
  return `<div style="font-family:sans-serif">${bodyHtml}</div>`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const EMAIL_ADDRESS_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const wrapped = trimmed.match(/^[^<]*<([^>]+)>$/);
  return (wrapped?.[1] ?? trimmed).trim();
}

/** Reject CRLF and non-email recipients before handing off to Resend. */
export function sanitizeEmailRecipient(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || CRLF_PATTERN.test(trimmed)) return null;
  const address = extractEmailAddress(trimmed);
  if (CRLF_PATTERN.test(address) || !EMAIL_ADDRESS_PATTERN.test(address)) return null;
  return address;
}

/** Validate configured From / Reply-To values at startup. */
export function sanitizeConfiguredEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || CRLF_PATTERN.test(trimmed)) return null;
  const address = extractEmailAddress(trimmed);
  if (CRLF_PATTERN.test(address) || !EMAIL_ADDRESS_PATTERN.test(address)) return null;
  return trimmed;
}
