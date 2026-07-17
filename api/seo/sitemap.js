function apiBaseUrl() {
  const value = process.env.VITE_API_BASE_URL?.trim();
  if (!value) {
    throw new Error('Missing VITE_API_BASE_URL for SEO proxy');
  }
  return value.replace(/\/$/, '');
}

function isProductionDeployment() {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv) return vercelEnv === 'production';
  return process.env.NODE_ENV === 'production';
}

function emptySitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
}

export default async function handler(req, res) {
  if (!isProductionDeployment()) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(200).send(emptySitemap());
    return;
  }

  const part = typeof req.query.part === 'string' ? req.query.part : undefined;
  const path = part ? `/seo/sitemap-${part}.xml` : '/seo/sitemap.xml';

  try {
    const upstream = await fetch(`${apiBaseUrl()}${path}`, {
      headers: { Accept: 'application/xml' },
    });
    const body = await upstream.text();
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8',
    );
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(upstream.status).send(body);
  } catch {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send(emptySitemap());
  }
}
