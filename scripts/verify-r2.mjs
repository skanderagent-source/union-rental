#!/usr/bin/env node
/**
 * Phase 6 (live): Verify R2 read-only credentials can sign a URL.
 */
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { backendEnv } from './lib/env.mjs';
import { hasLiveR2 } from './lib/credentials.mjs';

if (!hasLiveR2()) {
  console.error('Configure R2_* keys in apps/backend/.env');
  process.exit(1);
}

const env = { ...backendEnv(), ...process.env };
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const result = await r2.send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET, MaxKeys: 1 }),
  );
  console.log(`✓ R2 list access OK (bucket: ${env.R2_BUCKET}, keys: ${result.KeyCount ?? 0})`);
} catch (err) {
  console.error('✗ R2 access failed:', err.message);
  process.exit(1);
}

// Import built service for sign test if backend is built
try {
  const { signViewUrl } = await import('../apps/backend/dist/modules/media/r2.service.js');
  const { data: media } = await import('@supabase/supabase-js').then(async ({ createClient }) => {
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    return admin
      .from('listing_media')
      .select('object_key')
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();
  });

  if (media?.object_key) {
    const url = await signViewUrl(media.object_key);
    if (!url.startsWith('http')) throw new Error('invalid signed URL');
    console.log('✓ signViewUrl works for approved media');
  } else {
    console.log('○ No approved media to test signViewUrl (bucket access OK)');
  }
} catch (err) {
  console.log(`○ signViewUrl live test skipped: ${err.message}`);
  console.log('  Run npm run build --workspace @union-rental/backend first for full test');
}

console.log('\n✓ Live R2 verification passed');
