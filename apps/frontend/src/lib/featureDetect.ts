export function hasCryptoRandomValues(): boolean {
  return typeof globalThis.crypto?.getRandomValues === 'function';
}

export function hasTrustedTypes(): boolean {
  const trustedTypes = (globalThis as typeof globalThis & {
    trustedTypes?: { createPolicy?: unknown };
  }).trustedTypes;
  return typeof trustedTypes?.createPolicy === 'function';
}

export function hasCssEscape(): boolean {
  return typeof globalThis.CSS?.escape === 'function';
}
