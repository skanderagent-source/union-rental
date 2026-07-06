#!/usr/bin/env node
/**
 * Phase 23: Verify DNS propagation (requires API_DOMAIN and FRONTEND_DOMAIN env vars).
 *
 * Usage:
 *   FRONTEND_DOMAIN=logigo.ca API_DOMAIN=api.logigo.ca node scripts/verify-dns.mjs
 */
import { fetchJson } from './lib/http.mjs';

const frontend = process.env.FRONTEND_DOMAIN;
const api = process.env.API_DOMAIN;

if (!frontend || !api) {
  console.error('Set FRONTEND_DOMAIN and API_DOMAIN environment variables');
  console.error('Example: FRONTEND_DOMAIN=logigo.ca API_DOMAIN=api.logigo.ca npm run verify-dns');
  process.exit(1);
}

let failed = 0;

console.log(`Checking ${frontend} (frontend)…`);
try {
  const { res } = await fetchJson(`https://${frontend}/`, { redirect: 'follow' });
  if (res.ok) console.log(`✓ https://${frontend}/ responds ${res.status}`);
  else {
    console.error(`✗ https://${frontend}/ → ${res.status}`);
    failed++;
  }
} catch (err) {
  console.error(`✗ https://${frontend}/ — ${err.message}`);
  failed++;
}

console.log(`Checking ${api} (API)…`);
try {
  const { res, body } = await fetchJson(`https://${api}/health`);
  if (res.ok && body?.ok === true) console.log(`✓ https://${api}/health OK`);
  else {
    console.error(`✗ https://${api}/health → ${res.status}`);
    failed++;
  }
} catch (err) {
  console.error(`✗ https://${api}/health — ${err.message}`);
  failed++;
}

if (failed) process.exit(1);
console.log('\n✓ DNS verification passed');
console.log('Also verify Resend DKIM/SPF/DMARC in the Resend dashboard');
