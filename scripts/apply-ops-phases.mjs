#!/usr/bin/env node
/**
 * Applies remaining plan phases (p4, p6, p19, p20, p21–p25):
 * - Offline verification always
 * - Live verification when credentials are configured
 *
 * Usage: npm run apply-ops [-- --live-only] [-- --offline-only]
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { credentialStatus, hasLiveR2, hasLiveSupabase } from './lib/credentials.mjs';
import { rootDir } from './lib/env.mjs';

const root = rootDir();
const args = process.argv.slice(2);
const offlineOnly = args.includes('--offline-only');
const liveOnly = args.includes('--live-only');

/** @type {Record<string, { offline: boolean; live: boolean | null; note?: string }>} */
const status = {};

function runNode(script) {
  const res = spawnSync('node', [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, SMOKE_SKIP_BUILD: '1' },
  });
  if (res.status === 0) {
    if (res.stdout.trim()) console.log(res.stdout.trim());
    return true;
  }
  console.error(res.stderr || res.stdout);
  return false;
}

function runNpm(script) {
  try {
    execSync(`npm run ${script}`, { stdio: 'inherit', cwd: root });
    return true;
  } catch {
    return false;
  }
}

console.log('=== Union Rental apply ops phases ===\n');
const creds = credentialStatus();
console.log('Credential readiness:');
console.log(`  Supabase live: ${hasLiveSupabase(creds) ? 'yes' : 'no (placeholders in .env)'}`);
console.log(`  R2 live:       ${hasLiveR2(creds) ? 'yes' : 'no (placeholders in .env)'}`);
console.log(`  DNS domains:   ${creds.dns.apiDomain || creds.dns.frontendDomain ? 'set' : 'not set (offline OK)'}\n`);

if (!liveOnly) {
  console.log('--- p4 database (offline) ---');
  status.p4 = { offline: runNode('scripts/verify-db-offline.mjs'), live: null };
}

if (!offlineOnly && hasLiveSupabase(creds)) {
  console.log('--- p4 database (live) ---');
  status.p4 = { ...status.p4, live: runNode('scripts/verify-db.mjs') };
} else if (!offlineOnly) {
  status.p4 = { ...status.p4, live: null, note: 'Fill SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env' };
  console.log('○ p4 live skipped — configure Supabase service role key');
}

if (!liveOnly) {
  console.log('\n--- p6 R2 (offline) ---');
  status.p6 = { offline: runNode('scripts/verify-r2-offline.mjs'), live: null };
}

if (!offlineOnly && hasLiveR2(creds)) {
  console.log('--- p6 R2 (live) ---');
  status.p6 = { ...status.p6, live: runNode('scripts/verify-r2.mjs') };
} else if (!offlineOnly) {
  status.p6 = { ...status.p6, live: null, note: 'Fill R2_* keys in apps/backend/.env' };
  console.log('○ p6 live skipped — R2 credentials required');
}

if (!liveOnly) {
  console.log('\n--- p19/p20 smoke (automated) ---');
  status.p19 = {
    offline: runNode('scripts/smoke-api.mjs'),
    live: null,
  };
}

if (!liveOnly) {
  console.log('\n--- p21–p25 deploy/cutover (offline) ---');
  const deployOk = runNode('scripts/verify-deploy-ready.mjs');
  const secOk = runNode('scripts/run-security-checklist.mjs');
  const cutoverOk = runNode('scripts/verify-cutover.mjs');
  status['p21-p25'] = {
    offline: deployOk && secOk && cutoverOk,
    live: null,
    note: 'Production deploy/DNS/cutover need domains + VPS/Vercel access',
  };
}

if (!offlineOnly && creds.dns.apiDomain && creds.dns.frontendDomain) {
  console.log('\n--- p23 DNS (live) ---');
  status['p21-p25'] = { ...status['p21-p25'], live: runNode('scripts/verify-dns.mjs') };
}

const manifest = {
  updatedAt: new Date().toISOString(),
  phases: status,
  credentialHints: {
    supabase: !hasLiveSupabase(creds),
    r2: !hasLiveR2(creds),
    dns: !creds.dns.apiDomain && !creds.dns.frontendDomain,
  },
};

const manifestPath = path.join(root, 'docs/ops-phase-status.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nWrote ${manifestPath}`);

console.log('\n=== Summary ===');
for (const [id, s] of Object.entries(status)) {
  const live =
    s.live === true ? '✓' : s.live === false ? '✗' : '○';
  console.log(`${id}: offline=${s.offline ? '✓' : '✗'} live=${live}${s.note ? ` (${s.note})` : ''}`);
}

const offlineFailed = Object.values(status).filter((s) => s.offline === false).length;
if (offlineFailed) {
  console.error(`\n${offlineFailed} offline phase(s) failed`);
  process.exit(1);
}

console.log('\n✓ All ops phases applied offline');
if (!hasLiveSupabase(creds) || !hasLiveR2(creds)) {
  console.log('Live steps pending — see docs/zero-gap-guide.md');
}
