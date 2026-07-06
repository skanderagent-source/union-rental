import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export function signViewUrl(objectKey: string): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey }),
    { expiresIn: env.R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS },
  );
}

export function signDownloadUrl(objectKey: string, filename: string): Promise<string> {
  const safe = filename.replace(/[^\w.\- ]/g, '_');
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${safe}"`,
    }),
    { expiresIn: env.R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS },
  );
}
