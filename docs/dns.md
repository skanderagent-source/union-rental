# DNS (Phase 23)

At the DNS provider for `YOUR_UNION_DOMAIN`:

| Record | Target |
|--------|--------|
| Apex (`@`) | Vercel (follow Vercel domain wizard) |
| `www` | Vercel |
| `api` A | Hostinger VPS public IPv4 |

## Resend (same zone)

Add DKIM, SPF, MX, and DMARC records from the Resend dashboard for `YOUR_UNION_DOMAIN`.

## After propagation

```bash
FRONTEND_DOMAIN=YOUR_UNION_DOMAIN API_DOMAIN=api.YOUR_UNION_DOMAIN npm run verify-dns
npm run post-dns
```

Then update production env:

**VPS** `apps/backend/.env`:

- `FRONTEND_ORIGIN=https://YOUR_UNION_DOMAIN`
- `PUBLIC_API_BASE_URL=https://api.YOUR_UNION_DOMAIN`
- `EMAIL_ENABLED=true`
- `EMAIL_FROM="LogiGo <notifications@YOUR_UNION_DOMAIN>"`

**Vercel**:

- `VITE_API_BASE_URL=https://api.YOUR_UNION_DOMAIN`
- `VITE_SITE_URL=https://YOUR_UNION_DOMAIN`

Restart: `pm2 restart union-rental-api` and redeploy Vercel.
