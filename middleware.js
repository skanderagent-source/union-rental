const EN_PATH_PREFIX = '/en';
const LISTING_PATH =
  /^\/logement\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;
const REFERRAL_INVENTORY_PATH = /^\/inventaire\/([a-z0-9]{3,32})$/;
const INVALID_REFERRAL_INVENTORY_PATH = /^\/inventaire\/[^/]+$/;
const LEGACY_REFERRAL_PATH = /^\/r\/([a-z0-9]{3,32})(?:\/logement\/([0-9a-f-]{36}))?$/;
const MAX_INVENTORY_PAGE = 500;

const CANONICAL_ROUTES = {
  home: '/',
  inventory: '/inventaire',
  about: '/a-propos',
};

const INVENTORY_FILTER_PARAMS = new Set([
  'q',
  'quartier',
  'taille',
  'prixMax',
  'page',
  'vue',
]);

function normalizePathname(pathname) {
  let path = pathname.trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path.toLowerCase();
}

function splitLocalePath(pathname) {
  const path = normalizePathname(pathname);
  if (path === EN_PATH_PREFIX) {
    return { locale: 'en', pathname: '/' };
  }
  if (path.startsWith(`${EN_PATH_PREFIX}/`)) {
    const stripped = path.slice(EN_PATH_PREFIX.length) || '/';
    return {
      locale: 'en',
      pathname: stripped.startsWith('/') ? stripped : `/${stripped}`,
    };
  }
  return { locale: 'fr', pathname: path };
}

function withLocalePath(locale, pathname) {
  const base = normalizePathname(pathname);
  if (locale === 'fr') return base;
  return base === '/' ? EN_PATH_PREFIX : `${EN_PATH_PREFIX}${base}`;
}

function isDuplicatePathVariant(pathname) {
  const path = normalizePathname(pathname);
  return (
    path === '/index.html' ||
    path.endsWith('.html') ||
    path.endsWith('.htm') ||
    path.endsWith('.php') ||
    path.endsWith('.aspx')
  );
}

function classifyAppPath(pathname) {
  const { pathname: path } = splitLocalePath(pathname);
  if (path === CANONICAL_ROUTES.home) return 'home';
  if (path === CANONICAL_ROUTES.inventory) return 'inventory';
  if (path === CANONICAL_ROUTES.about) return 'about';
  if (REFERRAL_INVENTORY_PATH.test(path)) return 'inventory_referral';
  if (LISTING_PATH.test(path)) return 'listing';
  if (LEGACY_REFERRAL_PATH.test(path)) return 'legacy_referral';
  return 'unknown';
}

function extractListingId(pathname) {
  const { pathname: path } = splitLocalePath(pathname);
  const match = path.match(LISTING_PATH);
  return match?.[1] ?? null;
}

function normalizeInventoryQueryParams(params) {
  const cleaned = new URLSearchParams();

  for (const key of INVENTORY_FILTER_PARAMS) {
    const value = params.get(key);
    if (value == null || value === '') continue;

    if (key === 'page') {
      const pageNum = Number.parseInt(value, 10);
      if (!Number.isFinite(pageNum) || pageNum < 1) continue;
      const capped = Math.min(pageNum, MAX_INVENTORY_PAGE);
      if (capped === 1) continue;
      cleaned.set('page', String(capped));
      continue;
    }

    if (key === 'vue') {
      if (value === 'carte') cleaned.set('vue', 'carte');
      continue;
    }

    cleaned.set(key, value);
  }

  return cleaned;
}

function cleanQueryString(pathname, search) {
  const kind = classifyAppPath(pathname);
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  let cleaned = new URLSearchParams();

  if (kind === 'inventory' || kind === 'inventory_referral') {
    cleaned = normalizeInventoryQueryParams(params);
  }

  const serialized = cleaned.toString();
  return serialized ? `?${serialized}` : '';
}

function resolveCanonicalRedirect(pathname, search) {
  const { locale, pathname: basePath } = splitLocalePath(pathname);
  const rawSearch = search.startsWith('?') ? search : search ? `?${search}` : '';
  const normalizedPath = normalizePathname(basePath);

  if (isDuplicatePathVariant(pathname)) {
    return { pathname: withLocalePath(locale, CANONICAL_ROUTES.home), search: '' };
  }

  const kind = classifyAppPath(normalizedPath);
  const cleanedSearch = cleanQueryString(normalizedPath, rawSearch);

  if (
    INVALID_REFERRAL_INVENTORY_PATH.test(normalizedPath) &&
    !REFERRAL_INVENTORY_PATH.test(normalizedPath)
  ) {
    return {
      pathname: withLocalePath(locale, CANONICAL_ROUTES.inventory),
      search: cleanedSearch,
    };
  }

  if (kind === 'legacy_referral') {
    const match = normalizedPath.match(LEGACY_REFERRAL_PATH);
    const slug = match?.[1];
    const listingId = match?.[2]?.toLowerCase();
    if (slug && listingId && LISTING_PATH.test(`/logement/${listingId}`)) {
      return {
        pathname: withLocalePath(locale, `/logement/${listingId}`),
        search: '',
      };
    }
    if (slug) {
      return {
        pathname: withLocalePath(locale, CANONICAL_ROUTES.inventory),
        search: cleanedSearch,
      };
    }
  }

  if (kind === 'inventory_referral') {
    if (cleanedSearch !== rawSearch) {
      return { pathname: withLocalePath(locale, normalizedPath), search: cleanedSearch };
    }
    return null;
  }

  let targetPath = normalizedPath;
  if (kind === 'listing') {
    const listingId = extractListingId(normalizedPath);
    if (listingId) targetPath = `/logement/${listingId}`;
  }

  const localizedPath = withLocalePath(locale, targetPath);
  const localizedCurrent = withLocalePath(locale, normalizedPath);

  if (localizedPath !== localizedCurrent || cleanedSearch !== rawSearch) {
    return { pathname: localizedPath, search: cleanedSearch };
  }

  return null;
}

function canonicalSiteFromEnv() {
  const site = process.env.VITE_SITE_URL?.trim();
  if (!site) return null;
  try {
    const url = new URL(site);
    return {
      hostname: url.hostname.toLowerCase(),
      protocol: url.protocol,
    };
  } catch {
    return null;
  }
}

function isPreviewHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app')
  );
}

function errorHtml({ title, message, statusCode }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,follow" />
  <title>${title} — LogiGo</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
    p { line-height: 1.6; color: #444; }
    nav { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; margin-top: 1.5rem; }
    a { color: #0b5cab; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <nav>
    <a href="/">Accueil</a>
    <a href="/inventaire">Inventaire</a>
    <a href="/a-propos">Qui sommes-nous</a>
  </nav>
  <p style="margin-top:2rem;font-size:0.875rem;color:#666;">LogiGo — Appartements à louer dans le Grand Montréal</p>
</body>
</html>`;
}

async function fetchListingStatus(listingId, apiBase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${apiBase}/seo/listing/${listingId}/status`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 200) return 'available';
    if (res.status === 410) return 'gone';
    return 'not_found';
  } catch {
    return 'available';
  } finally {
    clearTimeout(timeout);
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/assets/') ||
    pathname === '/favicon.png' ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemap')
  ) {
    return;
  }

  const canonicalSite = canonicalSiteFromEnv();
  const requestHost = url.hostname.toLowerCase();

  if (canonicalSite && !isPreviewHost(requestHost) && requestHost !== canonicalSite.hostname) {
    const redirectUrl = new URL(request.url);
    redirectUrl.protocol = canonicalSite.protocol;
    redirectUrl.hostname = canonicalSite.hostname;
    redirectUrl.port = '';
    return Response.redirect(redirectUrl.toString(), 301);
  }

  const redirect = resolveCanonicalRedirect(pathname, url.search);
  if (redirect) {
    const target = new URL(request.url);
    target.pathname = redirect.pathname;
    target.search = redirect.search;
    return Response.redirect(target.toString(), 301);
  }

  const routeKind = classifyAppPath(pathname);
  if (routeKind === 'unknown') {
    return new Response(
      errorHtml({
        title: 'Page introuvable',
        message:
          'Cette page n’existe pas. Parcourez notre inventaire d’appartements dans le Grand Montréal.',
        statusCode: 404,
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  if (routeKind === 'listing') {
    const listingId = extractListingId(pathname);
    const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/$/, '');
    if (listingId && apiBase) {
      const status = await fetchListingStatus(listingId, apiBase);
      if (status === 'gone') {
        return new Response(
          errorHtml({
            title: 'Logement retiré',
            message:
              'Ce logement n’est plus offert. Consultez notre inventaire pour d’autres appartements dans le Grand Montréal.',
            statusCode: 410,
          }),
          {
            status: 410,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          },
        );
      }
      if (status === 'not_found') {
        return new Response(
          errorHtml({
            title: 'Logement introuvable',
            message:
              'Ce lien de logement est invalide ou n’existe plus. Découvrez les logements disponibles dans le Grand Montréal.',
            statusCode: 404,
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          },
        );
      }
    }
  }

  return;
}

export const config = {
  matcher: ['/((?!assets/|api/|favicon.png|favicon.ico|manifest.webmanifest|robots.txt|sitemap).*)'],
};
