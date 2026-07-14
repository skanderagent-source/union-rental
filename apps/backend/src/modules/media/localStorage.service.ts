import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

function localPath(objectKey: string) {
  const root = env.FAST_RENTAL_LOCAL_STORAGE_ROOT;
  if (!root) return null;
  const safe = objectKey.replace(/\.\./g, '');
  return path.join(root, safe);
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
