#!/usr/bin/env node
/**
 * Post-DNS deployment checklist reminders.
 */
console.log('Post-DNS checklist (manual):');
console.log('');
console.log('1. Vercel: confirm custom domain active for frontend');
console.log('2. VPS: curl https://api.YOUR_UNION_DOMAIN/health → {"ok":true}');
console.log('3. Resend: domain verified (DKIM, SPF, DMARC green)');
console.log('4. Backend .env on VPS:');
console.log('   - FRONTEND_ORIGIN=https://YOUR_UNION_DOMAIN');
console.log('   - PUBLIC_API_BASE_URL=https://api.YOUR_UNION_DOMAIN');
console.log('   - EMAIL_ENABLED=true');
console.log('   - EMAIL_FROM="LogiGo <notifications@YOUR_UNION_DOMAIN>"');
console.log('5. Vercel env:');
console.log('   - VITE_API_BASE_URL=https://api.YOUR_UNION_DOMAIN');
console.log('   - VITE_SITE_URL=https://YOUR_UNION_DOMAIN');
console.log('6. pm2 restart union-rental-api && vercel redeploy');
console.log('7. Run: FRONTEND_DOMAIN=... API_DOMAIN=... npm run verify-dns');
console.log('8. Run production smoke: SMOKE_API_BASE_URL=https://api.YOUR_UNION_DOMAIN npm run smoke');
