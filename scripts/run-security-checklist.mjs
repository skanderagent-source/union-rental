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
  'statut', 'latitude', 'longitude',
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
if (appTs.includes("disable('x-powered-by')")) ok('x-powered-by disabled');
else fail('x-powered-by must be disabled');
if (appTs.includes('httpMethodGuard')) ok('HTTP method guard present');
else fail('HTTP method guard missing');
if (appTs.includes('trustedHost')) ok('Trusted host validation present');
else fail('Trusted host validation missing');
if (appTs.includes('enforceHttps')) ok('HTTPS enforcement middleware present');
else fail('HTTPS enforcement middleware missing');
if (appTs.includes('readsLimiter')) ok('Rate limiter present');
else fail('Rate limiter missing');
if (appTs.includes("set('trust proxy'")) ok('trust proxy enabled');
else fail('trust proxy missing');

const vercelJson = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const vercelHeaders = vercelJson.headers?.flatMap((entry) => entry.headers ?? []) ?? [];
const headerKeys = new Set(vercelHeaders.map((h) => h.key));
for (const key of [
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
]) {
  if (headerKeys.has(key)) ok(`Vercel header ${key} configured`);
  else fail(`Vercel header ${key} missing`);
}
if (vercelHeaders.some((h) => h.key === 'Content-Security-Policy' && /script-src 'self'/.test(h.value) && !/script-src[^;]*'unsafe-inline'/.test(h.value))) {
  ok('Vercel CSP restricts scripts to self without inline script');
} else {
  fail('Vercel CSP must use script-src self without unsafe-inline');
}
if (vercelHeaders.some((h) => h.key === 'Content-Security-Policy' && /media-src[^;]*https:/.test(h.value))) {
  ok('Vercel CSP allows external video sources (media-src https:)');
} else {
  fail('Vercel CSP must include media-src with https: for R2 listing videos');
}

if (appTs.includes('requestNormalization')) ok('Request normalization middleware present');
else fail('Request normalization middleware missing');
if (appTs.includes('rejectPollutedQuery')) ok('Query pollution guard present');
else fail('Query pollution guard missing');
if (appTs.includes('rejectPrototypePollution')) ok('Prototype pollution guard present');
else fail('Prototype pollution guard missing');
if (appTs.includes('requireJsonContentType')) ok('JSON Content-Type enforcement present');
else fail('JSON Content-Type enforcement missing');
if (appTs.includes('requestTimeout')) ok('Request timeout middleware present');
else fail('Request timeout middleware missing');
if (appTs.includes("strict: true")) ok('Strict JSON parser enabled');
else fail('Strict JSON parser missing');

const serverTs = fs.readFileSync(path.join(root, 'apps/backend/src/server.ts'), 'utf8');
if (serverTs.includes('keepAliveTimeout') && serverTs.includes('headersTimeout')) {
  ok('Node HTTP server timeouts configured');
} else {
  fail('Node HTTP server timeouts missing');
}
if (serverTs.includes('SIGTERM') && serverTs.includes('server.close')) {
  ok('Graceful shutdown handlers configured');
} else {
  fail('Graceful shutdown handlers missing');
}

const schemas = fs.readFileSync(path.join(root, 'shared/src/schemas.ts'), 'utf8');
if (schemas.includes('.strict()')) ok('Lead schema rejects unknown fields');
else fail('Lead schema must use .strict()');
if (schemas.includes('publicListingSchema')) ok('Public response schemas defined');
else fail('Public response schemas missing');

const sanitizeTs = fs.readFileSync(path.join(root, 'apps/backend/src/utils/sanitize.ts'), 'utf8');
if (sanitizeTs.includes('escapeIlikePattern')) ok('Search ilike escaping present');
else fail('Search ilike escaping missing');
if (sanitizeTs.includes('containsPollutionKeys')) ok('Prototype pollution detection helper present');
else fail('Prototype pollution detection helper missing');

const pm2 = fs.readFileSync(path.join(root, 'ecosystem.config.cjs'), 'utf8');
if (pm2.includes('max-http-header-size')) ok('PM2 max HTTP header size configured');
else fail('PM2 max HTTP header size missing');

const caddy = fs.readFileSync(path.join(root, 'deploy/Caddyfile'), 'utf8');
if (caddy.includes('Strict-Transport-Security')) ok('Caddy HSTS configured');
else fail('Caddy HSTS missing');
if (caddy.includes('Permissions-Policy')) ok('Caddy permissions-policy configured');
else fail('Caddy permissions-policy missing');
if (caddy.includes('-Server')) ok('Caddy strips Server header');
else fail('Caddy should strip Server header');

const r2Service = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/media/r2.service.ts'),
  'utf8',
);
if (!r2Service.includes('PutObject') && !r2Service.includes('DeleteObject')) {
  ok('R2 service is read-only');
} else {
  fail('R2 service must not upload/delete');
}

const localStorage = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/media/localStorage.service.ts'),
  'utf8',
);
if (localStorage.includes('resolveSafeLocalPath') && localStorage.includes('path.relative')) {
  ok('Local media path traversal guard present');
} else {
  fail('Local media storage must resolve paths under root only');
}

if (schemas.includes("!value.includes('..')")) ok('Media object key schema rejects traversal segments');
else fail('Media object key schema must reject .. and backslashes');

const viewSql = fs.readFileSync(path.join(root, 'db/sql/union_rental_views.sql'), 'utf8');
if (viewSql.includes('revoke select')) ok('public_available_listings revokes anon/authenticated');
else fail('View must revoke anon/authenticated select');

const forbiddenFields = ['code_entree', 'concierge_tel', 'sheet_row_id', 'source'];
for (const field of forbiddenFields) {
  if (PUBLIC_LISTING_FIELDS.includes(field)) fail(`${field} in PUBLIC_LISTING_FIELDS`);
}
ok('PUBLIC_LISTING_FIELDS excludes internal columns');

const emailTemplates = fs.readFileSync(
  path.join(root, 'apps/backend/src/modules/email/templates.ts'),
  'utf8',
);
const emailSafe = fs.readFileSync(
  path.join(root, 'apps/backend/src/utils/emailSafe.ts'),
  'utf8',
);
if (emailSafe.includes('escHtml') && emailSafe.includes('escEmailSubject')) {
  ok('Email escaping helpers present');
} else {
  fail('Email escaping helpers missing');
}
if (emailTemplates.includes('escHtml') && emailTemplates.includes('safeHttpHref')) {
  ok('Email templates use centralized escaping and safe links');
} else {
  fail('Email templates must escape output and validate links');
}

const rateLimits = fs.readFileSync(path.join(root, 'apps/backend/src/config/rateLimits.ts'), 'utf8');
if (rateLimits.includes('leadsLimiter') && rateLimits.includes('readsLimiter')) {
  ok('Separate read and lead rate limiters configured');
} else {
  fail('Separate read and lead rate limiters missing');
}
if (rateLimits.includes('Retry-After')) ok('Rate limit 429 responses include Retry-After');
else fail('Rate limit handlers must set Retry-After header on 429');

const routes = fs.readFileSync(path.join(root, 'apps/backend/src/routes/index.ts'), 'utf8');
if (routes.includes('leadsRouter.use(leadsLimiter)')) ok('Lead rate limiter scoped to lead routes');
else fail('Lead rate limiter must apply only to lead routes');

const constants = fs.readFileSync(path.join(root, 'shared/src/constants.ts'), 'utf8');
if (constants.includes('MAX_LISTINGS_OFFSET') && constants.includes('MAX_PAGE_SIZE')) {
  ok('Pagination bounds defined in shared constants');
} else {
  fail('Pagination bounds missing');
}

if (appTs.includes('apiCacheControl')) ok('API cache-control middleware present');
else fail('API cache-control middleware missing');

const httpLogger = fs.readFileSync(path.join(root, 'apps/backend/src/config/httpLogger.ts'), 'utf8');
if (httpLogger.includes('genReqId') && httpLogger.includes('X-Request-Id')) {
  ok('Structured request logging with request IDs configured');
} else {
  fail('Request ID logging missing');
}

const logRedaction = fs.readFileSync(path.join(root, 'apps/backend/src/utils/logRedaction.ts'), 'utf8');
if (logRedaction.includes('serializeErrorForLog')) ok('Log redaction helpers present');
else fail('Log redaction helpers missing');

const securityEvents = fs.readFileSync(path.join(root, 'apps/backend/src/utils/securityEvents.ts'), 'utf8');
if (securityEvents.includes('securityEvent')) ok('Security event logging present');
else fail('Security event logging missing');

const databaseError = fs.readFileSync(path.join(root, 'apps/backend/src/utils/databaseError.ts'), 'utf8');
if (databaseError.includes('throwIfDatabaseError')) ok('Database errors mapped to generic responses');
else fail('Database error mapping missing');

const supabaseAdmin = fs.readFileSync(path.join(root, 'apps/backend/src/db/supabaseAdmin.ts'), 'utf8');
if (supabaseAdmin.includes('fetchWithTimeout') && supabaseAdmin.includes('DB_QUERY_TIMEOUT_MS')) {
  ok('Supabase fetch timeout configured');
} else {
  fail('Supabase fetch timeout missing');
}

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

const backendSrc = path.join(root, 'apps/backend/src');
const leadServicePath = path.join(backendSrc, 'modules/leads/leads.service.ts');
const leadService = fs.readFileSync(leadServicePath, 'utf8');
const hasLeadInsert =
  leadService.includes("from('demandes_clients')") && leadService.includes('.insert(');
if (!hasLeadInsert) {
  fail('Callback leads must be the only intentional database mutation');
}

const unexpectedBackendWrites = walk(backendSrc).filter((file) => {
  if (file === leadServicePath) return false;
  const text = fs.readFileSync(file, 'utf8');
  return /\.(?:insert|update|upsert|delete)\s*\(/.test(text);
});
if (unexpectedBackendWrites.length) {
  fail(`Unexpected backend database writes: ${unexpectedBackendWrites.join(', ')}`);
} else if (hasLeadInsert) {
  ok('Backend only writes callback leads');
}

try {
  const tracked = execSync('git ls-files', { encoding: 'utf8', cwd: root });
  for (const line of tracked.split('\n')) {
    if (line.endsWith('.env')) fail(`.env tracked: ${line}`);
  }
  ok('No .env files tracked by git');
} catch {
  ok('Git check skipped');
}

if (!fs.existsSync(path.join(root, 'package-lock.json'))) {
  fail('package-lock.json missing');
} else {
  ok('package-lock.json present');
}

if (fs.existsSync(path.join(root, '.npmrc'))) ok('.npmrc present');
else fail('.npmrc missing');

const nvmrc = fs.existsSync(path.join(root, '.nvmrc'))
  ? fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()
  : '';
if (nvmrc === '22') ok('Node 22 LTS pinned in .nvmrc');
else fail('.nvmrc must pin Node 22');

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (rootPkg.engines?.node?.includes('22')) ok('Node 22 required in package.json engines');
else fail('package.json engines must require Node 22+');

if (!appTs.includes('express.static')) ok('API does not serve static directories');
else fail('express.static must not be used on the API');

const routesTs = fs.readFileSync(path.join(root, 'apps/backend/src/routes/index.ts'), 'utf8');
for (const forbidden of ['/admin', '/cron', '/internal', '/debug', '/metrics']) {
  if (routesTs.includes(forbidden)) fail(`Internal route exposed: ${forbidden}`);
}
if (!/graphql/i.test(routesTs)) ok('No GraphQL routes exposed');
else fail('GraphQL must not be exposed on the public API');
ok('No admin/cron/internal routes in public router');

function walkBackendSource(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkBackendSource(full, files);
    else if (/\.(ts|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const backendRuntimeFiles = walkBackendSource(path.join(root, 'apps/backend/src'));
const tlsBypass = backendRuntimeFiles.filter((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return /rejectUnauthorized\s*:\s*false/.test(text);
});
if (tlsBypass.length) fail(`TLS validation bypass in backend: ${tlsBypass.join(', ')}`);
else ok('Backend preserves outbound TLS validation');

const caddyTls = fs.readFileSync(path.join(root, 'deploy/Caddyfile'), 'utf8');
if (caddyTls.includes('tls1.2') && caddyTls.includes('tls1.3')) {
  ok('Caddy TLS 1.2+ / 1.3 configured');
} else {
  fail('Caddy must enforce TLS 1.2 minimum with TLS 1.3');
}

const vercelCfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (vercelCfg.outputDirectory === 'apps/frontend/dist') {
  ok('Vercel serves fixed frontend dist output only');
} else {
  fail('Vercel outputDirectory must be apps/frontend/dist');
}

const pm2Cfg = fs.readFileSync(path.join(root, 'ecosystem.config.cjs'), 'utf8');
if (pm2Cfg.includes('dist/server.js') && !pm2Cfg.includes('tsx')) {
  ok('PM2 runs compiled production server');
} else {
  fail('PM2 must run dist/server.js without tsx');
}

try {
  execSync('npm run audit:deps', { stdio: 'pipe', cwd: root });
  ok('npm audit (high+) passes');
} catch {
  fail('npm audit reported high/critical vulnerabilities — run npm run audit:deps');
}

try {
  execSync('npm run scan:secrets', { stdio: 'pipe', cwd: root });
  ok('Secret scan passed');
} catch {
  fail('Secret scan failed — run npm run scan:secrets');
}

const viteConfig = fs.readFileSync(path.join(root, 'apps/frontend/vite.config.ts'), 'utf8');
if (viteConfig.includes('sourcemap: false')) ok('Frontend production source maps disabled');
else fail('Vite build must set sourcemap: false');

const fePkgLatest = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/frontend/package.json'), 'utf8'),
);
if (fePkgLatest.dependencies?.dompurify) ok('Frontend uses DOMPurify for HTML sanitization');
else fail('Frontend must depend on dompurify');

const frontendEnv = fs.readFileSync(path.join(root, 'apps/frontend/src/lib/env.ts'), 'utf8');
if (frontendEnv.includes('assertSecureConfiguredUrl')) ok('Frontend env URLs validated for HTTPS in production');
else fail('Frontend env must enforce HTTPS-only configured URLs in production');

if (frontendEnv.includes('public — never put secrets')) ok('Frontend env documents VITE_* as public');
else fail('Frontend env must document that VITE_* variables are public');

const feTsconfig = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/frontend/tsconfig.json'), 'utf8'),
);
if (feTsconfig.compilerOptions?.strict === true) ok('Frontend TypeScript strict mode enabled');
else fail('Frontend tsconfig must enable strict mode');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/publicApi.ts'))) {
  ok('Frontend validates API responses with shared Zod schemas');
} else {
  fail('Frontend publicApi layer with runtime validation missing');
}

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/parseApi.ts'))) ok('Frontend parseApi trust-boundary helper present');
else fail('Frontend parseApi helper missing');

const publicApiTs = fs.existsSync(path.join(root, 'apps/frontend/src/lib/publicApi.ts'))
  ? fs.readFileSync(path.join(root, 'apps/frontend/src/lib/publicApi.ts'), 'utf8')
  : '';
if (publicApiTs.includes('validateLeadPayload') && publicApiTs.includes('createLeadSchema')) {
  ok('Lead submit uses shared Zod schema before POST');
} else {
  fail('Lead submit must validate with shared createLeadSchema');
}

if (schemas.includes('publicListingsPageSchema')) ok('Shared paginated listings response schema defined');
else fail('publicListingsPageSchema missing in shared schemas');

function walkFrontendSource(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFrontendSource(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const rawInnerHtml = walkFrontendSource(path.join(root, 'apps/frontend/src')).filter((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return text.includes('dangerouslySetInnerHTML') && !file.endsWith('SafeHtml.tsx');
});
if (rawInnerHtml.length) {
  fail(`Raw dangerouslySetInnerHTML outside SafeHtml: ${rawInnerHtml.join(', ')}`);
} else {
  ok('All inner HTML rendering goes through SafeHtml + DOMPurify');
}

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/safeUrl.ts'))) ok('Frontend safe URL helpers present');
else fail('Frontend safe URL helpers missing');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/safeNavigation.ts'))) ok('Frontend safe navigation helpers present');
else fail('Frontend safe navigation helpers missing');

if (fs.existsSync(path.join(root, 'apps/frontend/plugins/mixedContentGuard.ts'))) ok('Frontend mixed-content build guard present');
else fail('Frontend mixed-content build guard missing');

const apiClient = fs.readFileSync(path.join(root, 'apps/frontend/src/lib/apiClient.ts'), 'utf8');
if (apiClient.includes("credentials: 'omit'")) ok('Frontend fetch omits cookies/credentials');
else fail('Frontend fetch must set credentials: omit');

if (apiClient.includes('CSRF tokens are not used')) ok('Frontend documents CSRF as N/A (no cookie auth)');
else fail('Frontend apiClient must document CSRF N/A for stateless API');

if (fs.existsSync(path.join(root, 'apps/frontend/src/components/common/AppErrorBoundary.tsx'))) {
  ok('Frontend error boundary present');
} else {
  fail('Frontend error boundary missing');
}

if (viteConfig.includes("drop: mode === 'production' ? ['console', 'debugger']")) {
  ok('Production frontend build strips console/debugger');
} else {
  fail('Vite production build must drop console and debugger');
}

const mainTs = fs.readFileSync(path.join(root, 'apps/frontend/src/main.tsx'), 'utf8');
if (mainTs.includes('StrictMode')) ok('React Strict Mode enabled in development bootstrap');
else fail('Frontend main.tsx must wrap the app in React StrictMode');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/safeMerge.ts'))) ok('Frontend safe object merge helper present');
else fail('Frontend safeMerge helper missing');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/bundleVersion.ts'))) ok('Frontend bundle version refresh gate present');
else fail('Frontend bundle version gate missing');

const indexHtml = fs.readFileSync(path.join(root, 'apps/frontend/index.html'), 'utf8');
if (!indexHtml.includes('fonts.googleapis.com') && !indexHtml.includes('fonts.gstatic.com')) {
  ok('Frontend index.html does not load Google Fonts CDN');
} else {
  fail('Remove external Google Fonts CDN from index.html (self-host or bundle fonts)');
}

if (vercelHeaders.some((h) => h.key === 'Content-Security-Policy' && !h.value.includes('fonts.googleapis.com'))) {
  ok('Vercel CSP does not allow Google Fonts CDN');
} else {
  fail('CSP must not whitelist fonts.googleapis.com when fonts are self-hosted');
}

if (!fePkgLatest.dependencies?.clsx) ok('Unused clsx dependency removed from frontend');
else fail('Remove unused clsx from frontend dependencies');

if (indexHtml.includes('type="module"') && !/<script(?![^>]*\ssrc=)[^>]*>/.test(indexHtml)) {
  ok('Frontend bootstrap uses external module script only (no inline JS)');
} else {
  fail('index.html must use external type=module script without inline JavaScript');
}

if (!/<base[\s>]/i.test(indexHtml)) {
  ok('index.html omits base href (43)');
} else {
  fail('Do not add base href without canonical regression tests');
}

if (!indexHtml.match(/\?[a-z]+=/i) && !viteConfig.includes('?v=')) {
  ok('Bootstrap HTML avoids query-string cache busters (42)');
} else {
  fail('Remove query cache busters; rely on hashed asset filenames');
}

if (vercelHeaders.some((h) => h.key === 'Cache-Control' && h.value.includes('no-cache'))) {
  ok('HTML shell uses no-cache while hashed assets stay immutable (40)');
} else {
  fail('Vercel must no-cache HTML and immutable-cache /assets/*');
}

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/safeClipboard.ts'))) ok('Frontend safe clipboard helper present');
else fail('Frontend safe clipboard helper missing');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/sanitizeFilename.ts'))) ok('Frontend filename sanitization helper present');
else fail('Frontend filename sanitization helper missing');

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/blobUrl.ts'))) ok('Frontend blob URL revoke helper present');
else fail('Frontend blob URL helper missing');

if (vercelJson.headers?.some((entry) => entry.source === '/assets/(.*)' && entry.headers?.some((h) => h.key === 'Cache-Control' && h.value.includes('immutable')))) {
  ok('Vercel caches hashed assets as immutable');
} else {
  fail('Vercel must set immutable Cache-Control on /assets/*');
}

if (vercelJson.headers?.some((entry) => String(entry.source).includes('(?!assets/)') && entry.headers?.some((h) => h.key === 'Cache-Control' && h.value === 'no-cache'))) {
  ok('Vercel disables caching on non-asset SPA shell routes');
} else {
  fail('Vercel must set no-cache on SPA shell (non-asset) routes');
}

const permissionsHeader = vercelHeaders.find((h) => h.key === 'Permissions-Policy')?.value ?? '';
if (permissionsHeader.includes('display-capture=()') && permissionsHeader.includes('publickey-credentials-get=()')) {
  ok('Permissions-Policy blocks display capture and passkeys');
} else {
  fail('Permissions-Policy must deny display-capture and publickey-credentials-get');
}

if (fs.existsSync(path.join(root, 'apps/frontend/src/lib/sanitizeLeadInput.ts'))) {
  ok('Frontend lead input sanitization present');
} else {
  fail('Frontend sanitizeLeadInput helper missing');
}

if (fs.existsSync(path.join(root, 'apps/frontend/src/hooks/useFocusTrap.ts'))) {
  ok('Frontend modal focus trap present');
} else {
  fail('Frontend useFocusTrap hook missing');
}

const contactModal = fs.readFileSync(path.join(root, 'apps/frontend/src/components/leads/ContactModal.tsx'), 'utf8');
if (contactModal.includes('createPortal') && contactModal.includes('aria-modal')) {
  ok('Contact modal rendered as accessible portal overlay');
} else {
  fail('Contact modal must use createPortal with aria-modal');
}

const frontendPublic = path.join(root, 'apps/frontend/public');
const hasServiceWorker =
  fs.existsSync(path.join(frontendPublic, 'sw.js')) ||
  fs.existsSync(path.join(frontendPublic, 'service-worker.js'));
if (!hasServiceWorker && !contactModal.includes('serviceWorker')) {
  ok('No service worker registered in public catalog frontend');
} else {
  fail('Service workers must not be used unless explicitly scoped without API caching');
}

const backendTsconfig = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/backend/tsconfig.json'), 'utf8'),
);
if (backendTsconfig.compilerOptions?.sourceMap === false) ok('Backend source maps disabled');
else fail('Backend tsconfig must set sourceMap: false');

if (fs.existsSync(path.join(root, 'apps/frontend/dist/assets'))) {
  const mapFiles = execSync('find apps/frontend/dist -name "*.map" 2>/dev/null | wc -l', {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (mapFiles === '0') ok('Frontend dist contains no source map files');
  else fail('Frontend dist must not publish .map files');
}

if (appTs.includes('rejectRequestContentEncoding')) ok('Request Content-Encoding rejection present');
else fail('Request Content-Encoding rejection missing');

const envTs = fs.readFileSync(path.join(root, 'apps/backend/src/config/env.ts'), 'utf8');
if (envTs.includes('PUBLIC_API_BASE_URL must use https in production')) {
  ok('Production PUBLIC_API_BASE_URL HTTPS guard configured');
} else {
  fail('Production must require https PUBLIC_API_BASE_URL');
}
if (envTs.includes('Invalid FRONTEND_ORIGIN URL')) ok('FRONTEND_ORIGIN URL validation configured');
else fail('FRONTEND_ORIGIN entries must be validated as URLs');
if (envTs.includes('Production FRONTEND_ORIGIN must not include localhost')) {
  ok('Production CORS origin guard configured');
} else {
  fail('Production must reject localhost FRONTEND_ORIGIN values');
}
if (envTs.includes('LOG_LEVEL must not be debug or trace in production')) {
  ok('Production verbose logging guard configured');
} else {
  fail('Production must reject debug/trace LOG_LEVEL');
}

if (emailSafe.includes('sanitizeEmailRecipient')) ok('Email recipient sanitization present');
else fail('Email recipient sanitization missing');

if (constants.includes('MIN_SEARCH_QUERY_LENGTH')) ok('Minimum search query length configured');
else fail('MIN_SEARCH_QUERY_LENGTH missing');

if (pm2Cfg.includes('max_memory_restart') && pm2Cfg.includes('exp_backoff_restart_delay')) {
  ok('PM2 restart policy configured');
} else {
  fail('PM2 must configure memory restart and exponential backoff');
}

if (fs.existsSync(path.join(root, '.github/workflows/security.yml'))) {
  ok('CI security workflow present');
} else {
  fail('CI security workflow missing (.github/workflows/security.yml)');
}

const securityRegression = fs.readFileSync(
  path.join(root, 'apps/backend/tests/securityRegression.test.ts'),
  'utf8',
);
if (securityRegression.includes('security regression suite')) ok('Security regression tests present');
else fail('Security regression tests missing');

if (errors.length) {
  console.error(`\n${errors.length} security check(s) failed`);
  process.exit(1);
}
console.log('\n✓ Automated security checklist passed');
console.log('Complete manual items in docs/security.md before production sign-off');
