import DOMPurify from 'dompurify';
import { hasTrustedTypes } from './featureDetect';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'br', 'span', 'p', 'a'],
  ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof HTMLAnchorElement)) return;
  if (node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
  const href = node.getAttribute('href');
  if (href && !isSafeHtmlHref(href)) {
    node.removeAttribute('href');
  }
});

function isSafeHtmlHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  try {
    const parsed = new URL(trimmed, 'https://localhost');
    if (/^(javascript|vbscript|file):/i.test(parsed.protocol)) return false;
    if (parsed.protocol === 'data:') return false;
    if (parsed.protocol === 'http:') return import.meta.env.DEV;
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

let trustedHtmlPolicy: TrustedTypePolicy | null = null;
let trustedHtmlPolicyInitialized = false;

function getTrustedHtmlPolicy(): TrustedTypePolicy | null {
  if (trustedHtmlPolicyInitialized) return trustedHtmlPolicy;
  trustedHtmlPolicyInitialized = true;

  if (!hasTrustedTypes()) return null;

  const trustedTypes = (globalThis as typeof globalThis & {
    trustedTypes?: { createPolicy: (name: string, rules: TrustedTypePolicyOptions) => TrustedTypePolicy | null };
  }).trustedTypes;

  if (!trustedTypes) return null;

  try {
    trustedHtmlPolicy =
      trustedTypes.createPolicy('union-rental-html', {
        createHTML: (input: string) => DOMPurify.sanitize(input, SANITIZE_CONFIG),
      }) ?? null;
  } catch {
    trustedHtmlPolicy = null;
  }

  return trustedHtmlPolicy;
}

/** Sanitize trusted i18n / CMS HTML before rendering. Uses Trusted Types when supported. */
export function sanitizeHtml(html: string): string {
  const policy = getTrustedHtmlPolicy();
  if (policy) {
    return String(policy.createHTML(html));
  }
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
