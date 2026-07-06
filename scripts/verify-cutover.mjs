#!/usr/bin/env node
/**
 * Phase 25: Verify cutover repo state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from './lib/env.mjs';

const root = rootDir();
let failed = 0;

if (fs.existsSync(path.join(root, 'legacy/index.html'))) {
  console.log('✓ legacy/index.html present');
} else {
  console.error('✗ missing legacy/index.html');
  failed++;
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.log('✓ root index.html removed (cutover repo state)');
} else {
  console.error('✗ root index.html still exists — move to legacy/ at cutover');
  failed++;
}

const redirect = path.join(root, 'legacy/cutover-vercel-redirect.json');
if (fs.existsSync(redirect)) {
  const json = JSON.parse(fs.readFileSync(redirect, 'utf8'));
  if (json.redirects?.[0]?.permanent) {
    console.log('✓ cutover redirect template ready');
  } else {
    console.error('✗ cutover-vercel-redirect.json must have permanent redirect');
    failed++;
  }
} else {
  console.error('✗ missing legacy/cutover-vercel-redirect.json');
  failed++;
}

const frontendSrc = path.join(root, 'apps/frontend/src');
let chatInReact = false;
for (const dir of [frontendSrc]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (typeof file !== 'string' || !/\.(tsx?|jsx?)$/.test(file)) continue;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    if (/chatbot|\/api\/chat/i.test(text)) chatInReact = true;
  }
}
if (chatInReact) {
  console.error('✗ chatbot still referenced in React app');
  failed++;
} else {
  console.log('✓ chatbot removed from new React stack');
}

if (failed) process.exit(1);
console.log('✓ Cutover verification passed (repo state)');
console.log('Live cutover: deploy redirect on old Vercel project, update Fast Rental CLIENT_SITE_URL');
