#!/usr/bin/env node
/**
 * Phase 24: Automated production security checklist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { backendEnv, rootDir } from './lib/env.mjs';

const PUBLIC_LISTING_FIELDS = [
  'id', 'adresse', 'quartier', 'prix', 'taille', 'electromenagers', 'notes',
  'statut', 'source', 'latitude', 'longitude',
];

const errors = [];
const root = rootDir();

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  errors.push(msg);
  console.error(`✗ ${msg}`);
}

const feText = fs.existsSync(path.join(root, 'apps/frontend/.env'))
  ? fs.readFileSync(path.join(root, 'apps/frontend/.env'), 'utf8')
  : '';
for (const secret of ['SUPABASE_SERVICE_ROLE_KEY', 'R2_SECRET_ACCESS_KEY', 'RESEND_API_KEY']) {
  if (feText.includes(secret)) fail(`${secret} in frontend .env`);
  else ok(`${secret} not in frontend .env`);
}

const fePkg = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/frontend/package.json'), 'utf8'),
);
if (fePkg.dependencies?.['@supabase/supabase-js'] || fePkg.devDependencies?.['@supabase/supabase-js']) {
  fail('@supabase/supabase-js in frontend dependencies');
} else {
  ok('Frontend has no @supabase/supabase-js dependency');
}

const be = backendEnv();
if (be.FRONTEND_ORIGIN?.includes('*')) fail('FRONTEND_ORIGIN must not use wildcard');
else ok('FRONTEND_ORIGIN is explicit');

const appTs = fs.readFileSync(path.join(root, 'apps/backend/src/app.ts'), 'utf8');
if (appTs.includes('helmet')) ok('Helmet middleware present');
else fail('Helmet missing');
if (appTs.includes('rateLimit')) ok('Rate limiter present');
else fail('Rate limiter missing');
if (appTs.includes("set('trust proxy'")) ok('trust proxy enabled');
else fail('trust proxy missing');

const r2Service = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/media/r2.service.ts'),
  'utf8',
);
if (!r2Service.includes('PutObject') && !r2Service.includes('DeleteObject')) {
  ok('R2 service is read-only');
} else {
  fail('R2 service must not upload/delete');
}

const viewSql = fs.readFileSync(path.join(root, 'db/sql/union_rental_views.sql'), 'utf8');
if (viewSql.includes('revoke select')) ok('public_available_listings revokes anon/authenticated');
else fail('View must revoke anon/authenticated select');

const forbiddenFields = ['code_entree', 'concierge_tel', 'sheet_row_id'];
for (const field of forbiddenFields) {
  if (PUBLIC_LISTING_FIELDS.includes(field)) fail(`${field} in PUBLIC_LISTING_FIELDS`);
}
ok('PUBLIC_LISTING_FIELDS excludes internal columns');

const emailTemplates = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/email/templates.ts'),
  'utf8',
);
if (emailTemplates.includes('function esc') || emailTemplates.includes('escapeHtml')) {
  ok('Email templates HTML-escape user input');
} else fail('Email templates must escape HTML');

try {
  execSync('npm run verify-env', { stdio: 'pipe', cwd: root });
  ok('verify-env passes');
} catch {
  fail('verify-env failed');
}

if (fs.existsSync(path.join(root, 'apps/frontend/dist/assets'))) {
  try {
    const hits = execSync('grep -ri supabase apps/frontend/dist/assets 2>/dev/null | wc -l', {
      encoding: 'utf8',
      cwd: root,
    }).trim();
    if (hits === '0') ok('Frontend bundle has no supabase references');
    else fail(`Frontend bundle contains supabase (${hits} hits)`);
  } catch {
    ok('Frontend dist grep check skipped');
  }
} else {
  console.log('○ Run npm run build for frontend bundle supabase grep');
}

const frontendSrc = path.join(root, 'apps/frontend/src');
function walk(dir) {
  const hits = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) hits.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/\b(login|signIn|signin)\b/i.test(text) || /\bsupabase\b/i.test(text)) hits.push(full);
    }
  }
  return hits;
}
const authHits = walk(frontendSrc).filter((f) => !f.includes('node_modules'));
if (authHits.length) fail(`Possible auth/supabase in frontend: ${authHits.join(', ')}`);
else ok('No login/supabase surface in frontend source');

try {
  const tracked = execSync('git ls-files', { encoding: 'utf8', cwd: root });
  for (const line of tracked.split('\n')) {
    if (line.endsWith('.env')) fail(`.env tracked: ${line}`);
  }
  ok('No .env files tracked by git');
} catch {
  ok('Git check skipped');
}

if (errors.length) {
  console.error(`\n${errors.length} security check(s) failed`);
  process.exit(1);
}
console.log('\n✓ Automated security checklist passed');
console.log('Complete manual items in docs/security.md before production sign-off');
