#!/usr/bin/env node
/**
 * Scan tracked source files for accidentally committed secrets.
 * Safe to run in CI before deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir } from './lib/env.mjs';

const root = rootDir();

const SKIP_SUFFIXES = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.map',
];

const SKIP_PATH_PARTS = [
  '/node_modules/',
  '/dist/',
  '/.git/',
  'package-lock.json',
  'scan-secrets.mjs',
];

const ALLOWLIST_LINE = [
  /your-service-role-key/i,
  /your-readonly-secret-access-key/i,
  /your-readonly-access-key-id/i,
  /your-cloudflare-account-id/i,
  /test-service-role-key/i,
  /test-secret/i,
  /test-key/i,
  /example\.supabase\.co/i,
  /notifications@YOUR_UNION_DOMAIN/i,
];

const SECRET_PATTERNS = [
  { name: 'Private key block', re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Supabase service role JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Cloudflare R2 secret key', re: /\b[a-f0-9]{32,}\b/ },
];

function shouldSkipFile(filePath) {
  if (SKIP_SUFFIXES.some((suffix) => filePath.endsWith(suffix))) return true;
  if (SKIP_PATH_PARTS.some((part) => filePath.includes(part))) return true;
  if (filePath.endsWith('.env.example')) return true;
  return false;
}

function isAllowlistedLine(line) {
  return ALLOWLIST_LINE.some((pattern) => pattern.test(line));
}

function listTrackedFiles() {
  try {
    return execSync('git ls-files -z', { encoding: 'utf8', cwd: root })
      .split('\0')
      .filter(Boolean)
      .map((relative) => path.join(root, relative));
  } catch {
    return walk(root);
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      walk(full, files);
      continue;
    }
    files.push(full);
  }
  return files;
}

const findings = [];

for (const filePath of listTrackedFiles()) {
  if (shouldSkipFile(filePath)) continue;
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isAllowlistedLine(line)) continue;

    for (const pattern of SECRET_PATTERNS) {
      if (!pattern.re.test(line)) continue;
      if (pattern.name === 'Cloudflare R2 secret key' && !/R2_SECRET|SECRET_ACCESS|secret/i.test(line)) {
        continue;
      }
      findings.push({
        file: path.relative(root, filePath),
        line: index + 1,
        rule: pattern.name,
        excerpt: line.trim().slice(0, 120),
      });
    }
  }
}

if (findings.length) {
  console.error('Potential secrets detected in tracked files:\n');
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} [${finding.rule}]`);
    console.error(`    ${finding.excerpt}`);
  }
  process.exit(1);
}

console.log('✓ Secret scan passed (no high-confidence secret patterns in tracked files)');
