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

if (failed) {
  process.exit(1);
}

console.log('Environment check passed.');
