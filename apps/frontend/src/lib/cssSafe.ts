import { hasCssEscape } from './featureDetect';

/** Escape user-controlled values before using them in CSS selectors. */
export function escapeCssSelector(value: string): string {
  if (hasCssEscape()) {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/** Allow only simple static class tokens — never pass raw user input as class names. */
export function sanitizeClassToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Reject CSS values that could break out of inline style assignments. */
export function sanitizeInlineStyleValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[;{}]/.test(trimmed) || /url\s*\(/i.test(trimmed)) return null;
  return trimmed;
}
