#!/usr/bin/env node
/**
 * Phase 4 (offline): Verify SQL artifacts match plan intent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from './lib/env.mjs';

const root = rootDir();
let failed = 0;

function need(rel, snippets = []) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`✗ missing ${rel}`);
    failed++;
    return;
  }
  const sql = fs.readFileSync(full, 'utf8');
  for (const snippet of snippets) {
    if (!sql.toLowerCase().includes(snippet.toLowerCase())) {
      console.error(`✗ ${rel} missing "${snippet}"`);
      failed++;
    }
  }
  console.log(`✓ ${rel}`);
}

need('db/sql/0000_fast_rental_dependencies.sql', [
  'listing_media',
  'listing_media_counts',
  'sort_order',
  'security_invoker',
]);
need('db/sql/union_rental_views.sql', [
  'public_available_listings',
  'revoke select',
  "l.statut = 'Available'",
]);

const listingsService = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/listings/listings.service.ts'),
  'utf8',
);
if (!listingsService.includes("from('public_available_listings')")) {
  console.error('✗ listings.service.ts must query public_available_listings');
  failed++;
} else {
  console.log('✓ listings.service.ts uses public_available_listings');
}

if (!listingsService.includes(".order('sort_order'")) {
  console.error('✗ listings.service.ts must order media by sort_order');
  failed++;
} else {
  console.log('✓ listings.service.ts orders media by sort_order');
}

if (failed) process.exit(1);
console.log('✓ Offline database verification passed');
