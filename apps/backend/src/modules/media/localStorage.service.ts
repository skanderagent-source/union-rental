import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

/** Resolve object keys under the configured storage root; reject traversal and absolute paths. */
export function resolveSafeLocalPath(objectKey: string, root: string): string | null {
  if (!objectKey || objectKey.includes('\0') || path.isAbsolute(objectKey)) return null;

  const normalizedRoot = path.resolve(root);
  const target = path.resolve(normalizedRoot, objectKey);
  const relative = path.relative(normalizedRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;

  return target;
}

function localPath(objectKey: string) {
  const root = env.FAST_RENTAL_LOCAL_STORAGE_ROOT;
  if (!root) return null;
  return resolveSafeLocalPath(objectKey, root);
}

export function hasLocalStorageRoot() {
  return Boolean(env.FAST_RENTAL_LOCAL_STORAGE_ROOT);
}

export async function localObjectExists(objectKey: string) {
  const target = localPath(objectKey);
  if (!target) return false;
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export function openLocalObject(objectKey: string) {
  const target = localPath(objectKey);
  if (!target) throw new Error('Local storage root is not configured');
  return createReadStream(target);
}
