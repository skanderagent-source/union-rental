#!/usr/bin/env node
/**
 * Phase 6 (offline): Verify R2 read-only integration artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from './lib/env.mjs';

const root = rootDir();
let failed = 0;

const r2Service = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/media/r2.service.ts'),
  'utf8',
);

for (const snippet of ['S3Client', 'signViewUrl', 'signDownloadUrl', 'r2.cloudflarestorage.com']) {
  if (!r2Service.includes(snippet)) {
    console.error(`✗ r2.service.ts missing ${snippet}`);
    failed++;
  } else {
    console.log(`✓ r2.service.ts has ${snippet}`);
  }
}

if (r2Service.includes('PutObject') || r2Service.includes('DeleteObject')) {
  console.error('✗ r2.service.ts must be read-only (no Put/Delete)');
  failed++;
} else {
  console.log('✓ r2.service.ts is read-only');
}

if (!fs.existsSync(path.join(root, 'scripts/verify-r2.mjs'))) {
  console.error('✗ missing scripts/verify-r2.mjs');
  failed++;
} else {
  console.log('✓ scripts/verify-r2.mjs');
}

if (failed) process.exit(1);
console.log('✓ Offline R2 verification passed');
