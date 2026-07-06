# Operations

## PM2

```bash
pm2 status
pm2 logs union-rental-api
pm2 restart union-rental-api
pm2 save
```

## Caddy

```bash
sudo systemctl status caddy
sudo journalctl -u caddy --since "1 hour ago"
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Deploy update

```bash
cd /var/www/union-rental
git pull
npm install
npm run build --workspace @union-rental/shared
npm run build --workspace @union-rental/backend
pm2 restart union-rental-api
curl https://api.YOUR_UNION_DOMAIN/health
```

## Security checklist

- [ ] Service role key only on VPS (`chmod 600`)
- [ ] No Supabase/R2/Resend keys in Vercel or frontend `.env`
- [ ] R2 token is read-only, bucket-scoped
- [ ] Public API responses contain only whitelisted fields
- [ ] Rate limits return 429 under abuse
- [ ] Honeypot verified
- [ ] Resend domain verified
- [ ] `grep -ri supabase apps/frontend/dist/assets` returns nothing after build
- [ ] Fast Rental `0006` lockdown applied only after cutover

## Email test

```bash
TEST_EMAIL_TO="your@email.com" npm run send-test-email
```
