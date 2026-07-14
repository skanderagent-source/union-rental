import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';
import { localObjectExists } from './localStorage.service.js';
import { r2, signDownloadUrl as signR2DownloadUrl, signViewUrl as signR2ViewUrl } from './r2.service.js';

const r2ExistsCache = new Map<string, { exists: boolean; at: number }>();
const R2_EXISTS_CACHE_MS = 60_000;

async function objectExistsInR2(objectKey: string): Promise<boolean> {
  const cached = r2ExistsCache.get(objectKey);
  if (cached && Date.now() - cached.at < R2_EXISTS_CACHE_MS) {
    return cached.exists;
  }

  try {
    await r2.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey }));
    r2ExistsCache.set(objectKey, { exists: true, at: Date.now() });
    return true;
  } catch {
    r2ExistsCache.set(objectKey, { exists: false, at: Date.now() });
    return false;
  }
}

function localObjectUrl(objectKey: string, filename: string, inline: boolean) {
  const params = new URLSearchParams({
    key: objectKey,
    name: filename,
    inline: inline ? '1' : '0',
  });
  return `${env.PUBLIC_API_BASE_URL}/api/public/media/object?${params.toString()}`;
}

export async function resolveViewUrl(objectKey: string, filename: string): Promise<string> {
  if (env.FAST_RENTAL_LOCAL_STORAGE_ROOT && (await localObjectExists(objectKey))) {
    return localObjectUrl(objectKey, filename, true);
  }
  if (await objectExistsInR2(objectKey)) {
    return signR2ViewUrl(objectKey);
  }
  return signR2ViewUrl(objectKey);
}

export async function resolveDownloadUrl(objectKey: string, filename: string): Promise<string> {
  if (env.FAST_RENTAL_LOCAL_STORAGE_ROOT && (await localObjectExists(objectKey))) {
    return localObjectUrl(objectKey, filename, false);
  }
  if (await objectExistsInR2(objectKey)) {
    return signR2DownloadUrl(objectKey, filename);
  }
  return signR2DownloadUrl(objectKey, filename);
}
