import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const backendExample = [
  'NODE_ENV',
  'PORT',
  'PUBLIC_API_BASE_URL',
  'FRONTEND_ORIGIN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS',
  'RESEND_API_KEY',
  'EMAIL_ENABLED',
  'EMAIL_FROM',
  'EMAIL_REPLY_TO',
  'FAST_RENTAL_APP_URL',
  'GEOCODING_PROVIDER',
  'GEOCODING_USER_AGENT',
  'GEOCODING_BASE_URL',
  'GEOCODE_BACKFILL_ENABLED',
  'GEOCODE_BACKFILL_BATCH_SIZE',
  'CRON_GEOCODE_BACKFILL',
  'RATE_LIMIT_LEADS_WINDOW_MS',
  'RATE_LIMIT_LEADS_MAX',
  'RATE_LIMIT_READS_WINDOW_MS',
  'RATE_LIMIT_READS_MAX',
];

const frontendExample = ['VITE_API_BASE_URL', 'VITE_SITE_URL'];

const secretKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'R2_SECRET_ACCESS_KEY', 'RESEND_API_KEY'];

const placeholderPatterns = [
  /^your-/i,
  /^changeme$/i,
  /YOUR_/,
  /example\.com/i,
];

function isPlaceholder(value) {
  if (!value || String(value).trim() === '') return false;
  return placeholderPatterns.some((re) => re.test(String(value).trim()));
}

function parseEnvFile(path) {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8');
  const vars = new Map();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return vars;
}

let failed = false;
const warnings = [];

if (!existsSync(resolve('package.json'))) {
  console.error('Run from repository root.');
  process.exit(1);
}

const backendEnv = parseEnvFile(resolve('apps/backend/.env'));
const frontendEnv = parseEnvFile(resolve('apps/frontend/.env'));

if (!backendEnv) {
  console.error('Missing apps/backend/.env — copy from .env.example');
  failed = true;
}
if (!frontendEnv) {
  console.error('Missing apps/frontend/.env — copy from .env.example');
  failed = true;
}

if (backendEnv) {
  for (const key of backendExample) {
    if (!backendEnv.has(key)) {
      console.error(`Missing backend env: ${key}`);
      failed = true;
    }
  }
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'GEOCODING_USER_AGENT',
  ]) {
    const val = backendEnv.get(key);
    if (val && isPlaceholder(val)) {
      warnings.push(`${key} still has placeholder value — live API/deploy will fail until replaced`);
    }
  }
}

if (frontendEnv) {
  for (const key of frontendExample) {
    if (!frontendEnv.has(key)) {
      console.error(`Missing frontend env: ${key}`);
      failed = true;
    }
  }
  for (const key of secretKeys) {
    if (frontendEnv.has(key)) {
      console.error(`Secret ${key} must not appear in apps/frontend/.env`);
      failed = true;
    }
  }
}

try {
  const { execSync } = await import('node:child_process');
  const tracked = execSync('git ls-files 2>/dev/null', { encoding: 'utf8' });
  for (const line of tracked.split('\n')) {
    if (line.endsWith('.env')) {
      console.error(`.env tracked by git: ${line}`);
      failed = true;
    }
  }
} catch {
  // not a git repo yet — skip
}

if (failed) {
  process.exit(1);
}

if (warnings.length) {
  for (const w of warnings) console.warn(`Warning: ${w}`);
  console.log('Environment structure OK (placeholders remain — see docs/zero-gap-guide.md).');
} else {
  console.log('Environment check passed.');
}
