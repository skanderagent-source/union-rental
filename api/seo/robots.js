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

function localRobots() {
  return 'User-agent: *\nDisallow: /\n';
}

export default async function handler(req, res) {
  if (!isProductionDeployment()) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(200).send(localRobots());
    return;
  }

  try {
    const upstream = await fetch(`${apiBaseUrl()}/seo/robots.txt`, {
      headers: { Accept: 'text/plain' },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(upstream.status).send(body);
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send(localRobots());
  }
}
