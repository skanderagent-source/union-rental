# Deployment

## GitHub

1. Log in with the project Gmail account.
2. Create a private repository `union-rental`.
3. Push from `/home/frenki/Documents/Union Rental` (never commit `.env` files).

```bash
git init
git add .
git status   # verify no secrets
git commit -m "Union Rental full-stack split"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Vercel (frontend)

- Root: repository root
- Install: `npm install`
- Build: `npm run build --workspace @union-rental/shared && npm run build --workspace @union-rental/frontend`
- Output: `apps/frontend/dist`
- Env:
  - `VITE_API_BASE_URL=https://api.YOUR_UNION_DOMAIN`
  - `VITE_SITE_URL=https://YOUR_UNION_DOMAIN`

## VPS (backend)

Shared Hostinger VPS with Fast Rental. Union Rental uses **port 4001**.

```bash
git clone YOUR_GITHUB_REPO_URL /var/www/union-rental
cd /var/www/union-rental
npm install
npm run build --workspace @union-rental/shared
npm run build --workspace @union-rental/backend
nano apps/backend/.env
chmod 600 apps/backend/.env
pm2 start ecosystem.config.cjs
pm2 save
```

Caddy block:

```text
api.YOUR_UNION_DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:4001
}
```

## DNS

- Apex / `www` → Vercel
- `api` A record → VPS IP
- Resend DKIM/SPF/MX on `YOUR_UNION_DOMAIN`

## Resend

1. Create API key `union-rental-backend`.
2. Verify `YOUR_UNION_DOMAIN` in Resend dashboard.
3. Set `EMAIL_ENABLED=true`, `EMAIL_FROM="LogiGo <notifications@YOUR_UNION_DOMAIN>"` on VPS.

## Cutover redirect (old Vercel static site)

Deploy to the old `union-rental.vercel.app` project:

```json
{
  "redirects": [{
    "source": "/(.*)",
    "destination": "https://YOUR_UNION_DOMAIN/$1",
    "permanent": true
  }]
}
```

Update Fast Rental legacy `CLIENT_SITE_URL` to `https://YOUR_UNION_DOMAIN`.

Move `index.html` to `legacy/index.html` in this repo after smoke tests pass.
