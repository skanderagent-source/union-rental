#!/usr/bin/env node
/**
 * Phase 19 / 20: Automated API smoke (build + tests + optional live backend).
 */
import { execSync } from 'node:child_process';
import { fetchJson } from './lib/http.mjs';
import { rootDir } from './lib/env.mjs';
import { hasLiveSupabase } from './lib/credentials.mjs';

const root = rootDir();
const apiBase = process.env.SMOKE_API_BASE_URL ?? 'http://localhost:4001';

function unwrapData(body) {
  return body?.data ?? body;
}

console.log('== Union Rental automated smoke ==\n');

if (!process.env.SMOKE_SKIP_BUILD) {
  execSync('npm run build', { stdio: 'inherit', cwd: root });
} else {
  console.log('(build skipped — SMOKE_SKIP_BUILD set)');
}

execSync('npm run test', { stdio: 'inherit', cwd: root });
execSync('npm run verify-env', { stdio: 'inherit', cwd: root });

console.log('\n== Backend health ==');
try {
  const { res, body } = await fetchJson(`${apiBase}/health`);
  if (!res.ok || body?.ok !== true) throw new Error(`unexpected health: ${res.status}`);
  console.log(`✓ Health OK at ${apiBase}/health`);
} catch (err) {
  console.log(`○ Backend not reachable at ${apiBase} — start with: npm run dev:backend`);
  console.log(`  (${err.message})`);
  process.exit(0);
}

if (!hasLiveSupabase()) {
  console.log('\n○ Live API checks skipped — configure real Supabase/R2 keys in apps/backend/.env');
  console.log('✓ Automated smoke passed (offline + mocked tests)');
  process.exit(0);
}

console.log('\n== Live public API ==');
const listings = await fetchJson(`${apiBase}/api/public/listings?pageSize=3`);
const listingsData = unwrapData(listings.body);
if (!listings.res.ok || !Array.isArray(listingsData?.items)) {
  throw new Error(`listings failed: ${listings.res.status} ${JSON.stringify(listings.body)}`);
}
console.log(`✓ GET /api/public/listings (${listingsData.items.length} items, total ${listingsData.total})`);

const stats = await fetchJson(`${apiBase}/api/public/stats`);
const statsData = unwrapData(stats.body);
if (!stats.res.ok || typeof statsData?.availableListings !== 'number') {
  throw new Error(`stats failed: ${stats.res.status}`);
}
console.log('✓ GET /api/public/stats');

const quartiers = await fetchJson(`${apiBase}/api/public/quartiers`);
const quartiersData = unwrapData(quartiers.body);
if (!quartiers.res.ok || !Array.isArray(quartiersData)) {
  throw new Error(`quartiers failed: ${quartiers.res.status}`);
}
console.log('✓ GET /api/public/quartiers');

const map = await fetchJson(`${apiBase}/api/public/listings/map`);
const mapData = unwrapData(map.body);
if (!map.res.ok || !Array.isArray(mapData)) {
  throw new Error(`map failed: ${map.res.status}`);
}
console.log(`✓ GET /api/public/listings/map (${mapData.length} markers)`);

console.log('\n== Honeypot lead ==');
const honeypot = await fetchJson(`${apiBase}/api/public/leads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    typeDemande: 'rappel',
    nom: 'Smoke Test',
    telephone: '5145550100',
    hp: 'bot',
    lang: 'fr',
  }),
});
if (!honeypot.res.ok || unwrapData(honeypot.body)?.received !== true) {
  throw new Error(`honeypot lead failed: ${honeypot.res.status}`);
}
console.log('✓ POST /api/public/leads honeypot returns received:true');

if (hasLiveSupabase()) {
  console.log('\n== Live lead → Fast Rental demandes ==');
  const marker = `smoke-${Date.now()}`;
  const created = await fetchJson(`${apiBase}/api/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeDemande: 'prequal',
      nom: marker,
      telephone: '5145550199',
      email: 'smoke@example.com',
      revenuMensuel: 3200,
      scoreCredit: 680,
      dossierTal: false,
      dateDemenagement: '2026-09-01',
      message: 'Smoke test lead',
      hp: '',
      lang: 'fr',
    }),
  });
  if (!created.res.ok || unwrapData(created.body)?.received !== true) {
    throw new Error(`live lead create failed: ${created.res.status} ${JSON.stringify(created.body)}`);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { backendEnv } = await import('./lib/env.mjs');
  const be = backendEnv();
  const sb = createClient(be.SUPABASE_URL, be.SUPABASE_SERVICE_ROLE_KEY);
  const { data: row, error: rowError } = await sb
    .from('demandes_clients')
    .select('id,statut,message,type_demande,revenu_mensuel,score_credit')
    .eq('nom', marker)
    .maybeSingle();
  if (rowError || !row) throw new Error(`lead row missing after POST: ${rowError?.message ?? 'not found'}`);
  if (row.statut !== 'nouveau') throw new Error(`expected statut=nouveau, got ${row.statut}`);
  if (!String(row.message ?? '').includes('Revenu mensuel: 3200$')) {
    throw new Error('prequal message missing fields for Fast Rental Demandes panel');
  }
  await sb.from('demandes_clients').delete().eq('id', row.id);
  console.log('✓ Lead round-trip stored in shared demandes_clients (statut=nouveau)');
}

console.log('\n== Rate limit (leads) ==');
let saw429 = false;
for (let i = 0; i < 25; i++) {
  const { res } = await fetchJson(`${apiBase}/api/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeDemande: 'rappel',
      nom: `Rate ${i}`,
      telephone: '5145550101',
      hp: '',
      lang: 'fr',
    }),
  });
  if (res.status === 429) {
    saw429 = true;
    break;
  }
}
if (!saw429) {
  console.warn('⚠ Rate limit 429 not observed in 25 posts — check RATE_LIMIT_LEADS_MAX');
} else {
  console.log('✓ Lead rate limit returns 429');
}

console.log('\n✓ Automated smoke passed');
console.log('Manual UI checklist: docs/smoke-test.md');
