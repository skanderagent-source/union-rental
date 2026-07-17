# Production Security Checklist

Run this checklist before and after cutover. Automated checks: `npm run security-check`.

## Secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in VPS `apps/backend/.env` (`chmod 600`) and password manager
- [ ] `R2_SECRET_ACCESS_KEY` and `RESEND_API_KEY` never in Vercel, frontend `.env`, or git
- [x] `npm run verify-env` passes locally (structure OK; replace placeholder secrets for live)

## R2

- [ ] Token is **read-only**, S3-compatible, and scoped to Fast Rental's shared R2 bucket only
- [x] Union Rental backend never uploads or deletes objects (code review)

## API surface

- [x] Security headers via Helmet (HSTS in production, nosniff, referrer-policy, permissions-policy, frame-ancestors)
- [x] Express `x-powered-by` disabled
- [x] Host header validation against `PUBLIC_API_BASE_URL` + loopback (+ optional `TRUSTED_HOSTS`)
- [x] HTTP method guard rejects TRACE/TRACK and non GET/POST/OPTIONS/HEAD
- [x] CORS restricted to exact `FRONTEND_ORIGIN` values with explicit methods/headers
- [x] `TRUST_PROXY` configurable (default `1` for Caddy)
- [x] HTTPS redirect in production when `X-Forwarded-Proto` is `http` (Caddy also redirects at edge)
- [x] Public listing responses use `PUBLIC_LISTING_FIELDS` whitelist + signed media URLs
- [x] Zod validation on all API inputs (query, params, body)
- [x] Zod response schemas enforce public field allowlists before serialization
- [x] Lead inserts use explicit column allowlist separate from request DTO
- [x] Search filters escape `ilike` wildcards; Supabase client uses parameterized queries
- [x] No unsafe deserialization (`eval`, `vm`, YAML tags) in runtime code paths
- [ ] Manually inspect one `/api/public/listings` and one detail response in production for leaks (`code_entree`, `concierge_tel`, `sheet_row_id`)
- [ ] Review `notes` column with product owner — publicly visible by design (legacy parity)
- [x] No auth routes; no Supabase Auth calls in frontend
- [x] Union backend only mutates `demandes_clients` for callback leads; Fast Rental owns inventory and media writes
- [ ] CORS allows production domain only (+ localhost in development) — verify on VPS after deploy

## Abuse controls

- [x] Request normalization middleware rejects ambiguous paths and conflicting `Transfer-Encoding` + `Content-Length`
- [x] JSON body limit (`JSON_BODY_LIMIT`, default 100kb) with strict JSON parsing only
- [x] Duplicate query parameter rejection (HTTP parameter pollution)
- [x] Prototype pollution key rejection on parsed JSON bodies
- [x] Lead POST requires `Content-Type: application/json`
- [x] Node server keep-alive, headers, and request timeouts configured
- [x] Caddy reverse-proxy read/write timeouts configured
- [ ] Lead rate limit returns 429 after `RATE_LIMIT_LEADS_MAX` rapid posts (verify live: `npm run smoke` with real credentials)
- [ ] Honeypot verified in production (201 response, no DB row, no email)
- [x] `trust proxy` enabled so limits are per-visitor

## Email

- [ ] Resend domain verified (DKIM, SPF, DMARC)
- [x] Email templates escape HTML (`escHtml`) and sanitize subjects (`escEmailSubject`)
- [x] Admin email links restricted to `http:`/`https:` URLs
- [x] Prospect confirmation emails contain no internal data (template review)

## Supply chain and runtime

- [x] `package-lock.json` committed; installs use npm lockfile integrity
- [x] `npm run audit:deps` checks high/critical vulnerabilities (`npm audit --audit-level=high`)
- [x] Node.js 22 LTS enforced via `.nvmrc` and `engines.node >= 22`
- [x] Production API runs compiled `dist/server.js` via PM2 (no tsx/vitest in runtime)
- [x] Frontend production artifact is Vercel `apps/frontend/dist` only
- [x] TLS 1.2+ with TLS 1.3 preferred on Caddy edge
- [x] No `express.static` or directory listing on the API server
- [x] Vercel serves SPA from fixed `outputDirectory` with catch-all rewrite (no directory indexes)
- [ ] Run `npm run audit:deps` in CI or before each production deploy
- [ ] Keep separate Supabase/R2/Resend projects or keys per environment

## Internal/admin surface

Union Rental exposes **only** `/health` and `/api/public/*`. No admin, cron, diagnostics, background job, or feature-flag endpoints exist in this codebase.

- [x] No admin/cron/internal HTTP routes — N/A by architecture
- [x] Background jobs and feature flags — N/A (Fast Rental owns admin workflows)
- [x] Outbound log/telemetry redaction for secrets and PII (pino redact + error serializers)

## Container and infrastructure separation

This stack deploys as **Vercel (frontend) + Hostinger VPS/PM2 (API)**, not Docker.

- [x] Container hardening — N/A (no containers); VPS runs Node behind Caddy
- [x] Production/staging/dev separation — operational: distinct domains, env files, and Supabase credentials per environment

## Observability and operations

- [x] Structured logging with request IDs (`X-Request-Id`) via pino-http
- [x] Security events logged for rate limits, honeypot, invalid host, pollution attempts
- [x] PII and secret redaction in logs (lead fields, auth headers, API keys)
- [x] Centralized error handler returns generic 500s; database errors mapped server-side
- [x] No stack traces in production API responses
- [x] Supabase fetch timeout (`DB_QUERY_TIMEOUT_MS`, default 15s)
- [x] Graceful shutdown on SIGTERM/SIGINT (`SHUTDOWN_GRACE_MS`)
- [x] `/health` returns only `{ ok: true }` with `Cache-Control: no-store`
- [x] API cache-control (`no-store`) on all `/api/public` routes
- [ ] Wire production log monitoring/alerts for `securityEvent` fields (rate abuse, honeypot spikes)

## Secrets and environments (operational)

- [ ] Secrets live only in VPS `apps/backend/.env` (`chmod 600`) — never Vercel/git
- [ ] Use separate Supabase/R2/Resend credentials per environment (dev/staging/prod)
- [ ] Do not copy production tenant PII into local `.env` files or lower environments
- [ ] Supabase backups and access control — managed in Supabase dashboard (Union uses service role; Fast Rental owns migrations)
- [x] Application DB access scoped to required tables/views; anon/authenticated revoked on public view

## Data access and API boundaries

- [x] Pagination capped (`MAX_PAGE_SIZE`, `MAX_LISTINGS_OFFSET`); map results capped (`MAP_RESULT_CAP`)
- [x] Sorting is server-controlled only (no client-supplied sort columns)
- [x] Listing size filter restricted to known allowlist values
- [x] Public responses minimized via Zod output schemas and `PUBLIC_LISTING_FIELDS`
- [x] Listing/media access scoped to `public_available_listings` and approved media only
- [x] API responses use `Cache-Control: no-store` (no authenticated sessions in this app)
- [x] HTTPS redirects stay on the same host; frontend navigations are internal-only with UUID validation

## Authorization model (public app)

Union Rental has **no MFA, RBAC, admin APIs, account deletion, data export, soft delete, payments, or idempotency keys**. Those belong to Fast Rental.

- [x] MFA, step-up auth, RBAC, fine-grained scopes — N/A
- [x] IDOR/ownership checks for private resources — N/A (only public catalog data exposed)
- [x] Data export, soft delete, account deletion — N/A
- [x] Idempotency keys for payments/orders — N/A (single public lead POST endpoint)

## Authentication and sessions

Union Rental is a public catalog with **no login, sessions, cookies, or password flows**. Items below are intentionally out of scope for this app; they belong to Fast Rental if needed.

- [x] No authentication routes or session cookies in this codebase
- [x] CSRF not required (stateless JSON API, `credentials: false` CORS, no cookie auth)
- [x] Password hashing, reset tokens, email verification, OTP, and account lockout — N/A

## Abuse controls (public write endpoints)

- [x] Dedicated rate limiter on `POST /api/public/leads` (`RATE_LIMIT_LEADS_MAX`, default 20/min)
- [x] Read endpoints rate-limited separately (`RATE_LIMIT_READS_MAX`, default 240/min)

## Frontend bundle

```bash
grep -ri supabase apps/frontend/dist/assets | wc -l   # expect 0
```

- [x] Vercel edge headers: HSTS, CSP (no inline scripts), frame-ancestors, permissions-policy

- [x] No `@supabase/supabase-js` in frontend dependencies
- [x] No login UI anywhere

## Database lockdown

- [ ] Fast Rental `0006_lockdown_legacy_policies.sql` **not** applied until both new stacks are live
- [ ] After cutover, coordinate applying `0006` with Fast Rental team

## Automated verification (local)

```bash
npm run lint
npm run build
npm run test
npm run verify-env
npm run audit:deps
npm run security-check
grep -ri supabase apps/frontend/dist/assets | wc -l
```

All automated commands above pass in the current repo.

## Build artifacts and production mode

- [x] Frontend Vite build disables source maps (`sourcemap: false`)
- [x] Backend TypeScript build disables source maps (`sourceMap: false`)
- [x] API returns generic 500s without stack traces; production logs omit stacks (`serializeErrorForLog`)
- [x] Production rejects `LOG_LEVEL=debug|trace` and localhost `FRONTEND_ORIGIN` values at startup
- [x] PM2 runs compiled `dist/server.js` with `NODE_ENV=production` only
- [ ] After deploy, confirm Vercel serves only `apps/frontend/dist` with no `.map` files exposed

## CI/CD and secret hygiene

- [x] `npm run scan:secrets` scans tracked files for high-confidence secret patterns
- [x] GitHub Actions workflow runs secret scan, build, tests, and `security-check` on push/PR
- [ ] Ensure VPS deploy scripts never echo or archive `apps/backend/.env`

## Operations and infrastructure

- [ ] VPS time sync enabled (systemd-timesyncd or chrony) so signed URLs, logs, and rate-limit windows stay accurate
- [x] PM2 restart policy: memory cap (`512M`), exponential backoff, max restarts
- [ ] Monitor PM2 restarts and VPS memory/CPU; alert on repeated crashes
- [ ] Do not enable Node diagnostic reports/core dumps containing process env on production VPS

## Data retention and privacy

Union Rental inserts callback leads into shared `demandes_clients`; it does not expose account deletion or export APIs.

- [ ] Legal retention and deletion policy for prospect PII owned by the real-estate company (Fast Rental admin workflows)
- [ ] Coordinate GDPR/right-to-erasure requests through Fast Rental — Union Rental has no end-user accounts

## Search, contact forms, and abuse (public app)

- [x] Catalog search ignores single-character `q` values (`MIN_SEARCH_QUERY_LENGTH=2`)
- [x] Pagination caps, server-side sort, filter allowlists, read/lead rate limits, and DB query timeouts
- [x] Lead forms: strict Zod schema, honeypot, field max lengths, no attachments, generic `{ received: true }` response
- [x] Email handlers validate recipients/sender identities; Resend API used instead of raw SMTP header construction

## Security regression tests

- [x] Automated tests cover CORS denial, non-cacheable public API responses, no admin/auth routes, generic lead responses, and error responses without stacks
- [x] Rate limits and honeypot covered in `leads.test.ts`
- [x] CSRF — N/A (no cookie auth; CORS `credentials: false`)

## Authentication, sessions, and tokens (List 2 — N/A)

Union Rental has no login, JWT, API keys for clients, refresh tokens, or multi-tenant accounts. Items 1–11 and 16–20 from the extended checklist are out of scope.

- [x] Concurrent session limits, device management, JWT validation/rotation, API key storage, KMS — N/A
- [x] Replay/nonce/timestamp signed requests — N/A (no signed client API; public JSON only)
- [ ] Secrets rotation — operational: rotate Supabase/R2/Resend keys via provider dashboards when needed

## Public abuse controls (List 2 — applicable items)

- [x] Honeypot field (`hp`) on lead forms — bots get fake 201, no DB insert, security event logged
- [x] `Retry-After` header on 429 rate-limit responses (reads and leads)
- [x] CAPTCHA/challenge endpoints — excluded by product decision
- [x] Geo/IP reputation, impossible travel, risk-based auth — excluded; no authentication surface
- [x] Abuse fingerprinting beyond IP — not used; IP-based rate limits + honeypot + input validation suffice for this catalog

## Uploads, media, and outbound fetch (List 2 — items 21–40)

Union Rental does **not** accept file uploads (JSON lead POST only). Media is read-only from Fast Rental's R2 bucket or local dev storage.

- [x] Per-tenant rate limits/quotas — N/A (single public tenant)
- [x] Multipart upload limits, MIME validation, randomized filenames, malware/ZIP/image upload controls, temp upload cleanup — N/A (no uploads)
- [x] Uploads stored outside web roots — N/A; production media served via signed R2 URLs or gated `/api/public/media/object` (dev only)
- [x] Path traversal blocked in media keys (`mediaObjectQuerySchema`) and local storage path resolution (`resolveSafeLocalPath`)
- [x] Signed R2 URLs with TTL for protected media downloads (`R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS`)
- [x] Approved-media-only DB gate before any media URL or stream is returned
- [x] WebSocket, gRPC, webhooks, queue/job endpoints, worker auth, MQ signing — N/A (not in codebase)
- [x] SSRF protection — N/A; backend only fetches configured Supabase/R2 endpoints, never user-supplied URLs
- [x] DNS rebinding for admin panels — N/A (no admin panel; host validation on API)

## Resilience, caching, identity, and parsers (List 2 — items 41–60)

Union Rental is a small public JSON API with no OAuth, GraphQL, Redis, or document ingestion.

- [x] Circuit breakers for downstream APIs — lightweight equivalent: Supabase fetch timeout (`DB_QUERY_TIMEOUT_MS`), generic 500 mapping, email send failures logged without retry loops
- [x] Retry storm / backoff policies — N/A; no client-visible retry endpoints; rate limits cap inbound abuse
- [x] Cache poisoning protection — all `/api/public` and `/health` responses use `Cache-Control: no-store`; no shared CDN cache for API; CORS exact origins
- [x] Redis/Memcached auth, secure cache keys — N/A (no application cache layer)
- [x] Audit log tamper resistance — N/A; structured VPS logs only (operational retention/alerts)
- [x] Read-only DB roles / read replicas — service role required for lead writes; reads scoped to `public_available_listings` view with anon/authenticated revoked
- [ ] Blue/green or canary rollback — operational deploy practice on VPS/Vercel
- [ ] Signed build artifacts / provenance — optional CI hardening; not required for current deploy model
- [ ] Infrastructure drift detection — operational (VPS/Caddy/PM2 config management)
- [x] Admin route IP allowlisting — N/A (no admin routes)
- [x] OpenID Connect / OAuth callback validation — N/A (no login)
- [x] Claims normalization / IdP role mapping — N/A (no identity provider)
- [x] Response compression vs BREACH — acceptable: no session cookies or secrets in API bodies; errors generic; `no-store` on API; gzip on public JSON catalog only
- [x] XML/YAML/CSV/archive/PDF parser hardening — N/A (JSON-only API; no user document parsing)
- [x] Safe outbound shell execution — N/A in runtime API (`spawn`/`exec` only in dev/deploy scripts, not request path)
- [x] Outbound TLS validation — default Node/AWS SDK TLS for Supabase and R2; no `rejectUnauthorized: false`
- [x] Mutual TLS for service-to-service — N/A
- [x] GraphQL depth/complexity/persisted queries — N/A (REST only)

## Streaming, workers, frontend, and config (List 2 — items 61–72)

- [x] SSE / streaming API auth and connection limits — N/A (only dev local media `stream.pipe`; gated by approved-media DB check; no SSE)
- [x] Background workers, poison queues — N/A (no workers in this codebase)
- [x] DB migrations separated from app startup — Fast Rental owns migrations; Union API never runs migrations on boot
- [x] ORM tenant filters / cross-tenant scopes — N/A (single-tenant public view; no ORM; Supabase queries scoped to public views)
- [x] Request decompression controls — rejects `Content-Encoding` on incoming requests; JSON body capped at `JSON_BODY_LIMIT`
- [x] Runtime config schema validation — Zod validates env at startup (URLs, secrets, origins, timeouts, log level)
- [x] Dynamic CORS/CSP/redirect from validated config — `FRONTEND_ORIGIN`, `PUBLIC_API_BASE_URL`, Helmet/CORS/enforceHttps driven by env
- [x] Payment provider / webhook validation — N/A (no payments)
- [x] React CSP for bundles and CDNs — Vercel CSP: `script-src 'self'`, Google Fonts, `img-src`/`connect-src https:` for map tiles and API
- [x] React CORS scoped to app origins — backend `cors({ origin: FRONTEND_ORIGIN.split(...) })`
- [x] React CSRF for cookie auth — N/A (`credentials: false`; no session cookies)
- [x] React WebSocket auth — N/A (no WebSockets)
