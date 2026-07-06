#!/usr/bin/env node
/**
 * Phase 25: Prepare cutover redirect deployment for the old static Vercel project.
 * Writes deploy/vercel-cutover/vercel.json from legacy/cutover-vercel-redirect.json.
 *
 * Usage: YOUR_UNION_DOMAIN=logigo.ca node scripts/apply-cutover.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const domain = process.env.YOUR_UNION_DOMAIN;
if (!domain) {
  console.error('Set YOUR_UNION_DOMAIN (e.g. logigo.ca)');
  process.exit(1);
}

const template = JSON.parse(
  readFileSync(resolve('legacy/cutover-vercel-redirect.json'), 'utf8'),
);
const redirect = template.redirects?.[0];
if (!redirect) {
  console.error('legacy/cutover-vercel-redirect.json missing redirects[0]');
  process.exit(1);
}

redirect.destination = `https://${domain}/$1`;

const outDir = resolve('deploy/vercel-cutover');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'vercel.json'), `${JSON.stringify({ redirects: [redirect] }, null, 2)}\n`);

console.log(`✓ Wrote deploy/vercel-cutover/vercel.json → https://${domain}`);
console.log('Deploy that folder to the OLD union-rental.vercel.app static Vercel project.');
console.log('Then update Fast Rental CLIENT_SITE_URL to the same domain.');
