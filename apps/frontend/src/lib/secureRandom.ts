import { hasCryptoRandomValues } from './featureDetect';

/** Client-side nonces must use CSPRNG — never Math.random() for security-sensitive values. */
export function secureRandomHex(byteLength = 16): string | null {
  if (!hasCryptoRandomValues()) return null;
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
