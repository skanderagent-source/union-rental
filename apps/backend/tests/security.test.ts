import './setup.js';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getTrustedHosts, isTrustedHost } from '../src/utils/trustedHosts.js';

describe('security middleware', () => {
  it('does not expose x-powered-by', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets core security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('rejects TRACE and unsupported methods with 405', async () => {
    const blocked = [
      () => request(app).trace('/health'),
      () => request(app).put('/health'),
      () => request(app).delete('/health'),
      () => request(app).patch('/health'),
    ];

    for (const call of blocked) {
      const res = await call();
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(res.headers.allow).toBe('GET, POST, OPTIONS, HEAD');
    }
  });

  it('allows CORS preflight only for configured frontend origins', async () => {
    const allowed = await request(app)
      .options('/api/public/listings')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'GET');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    expect(allowed.headers['access-control-allow-methods']).toContain('GET');

    const blocked = await request(app)
      .options('/api/public/listings')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('trusted host helpers', () => {
  it('accepts loopback and PUBLIC_API_BASE_URL hosts', () => {
    const trusted = getTrustedHosts();
    expect(isTrustedHost('127.0.0.1:4001', trusted)).toBe(true);
    expect(isTrustedHost('localhost:4001', trusted)).toBe(true);
    expect(isTrustedHost('localhost:4001', trusted)).toBe(true);
    expect(isTrustedHost('example.supabase.co', trusted)).toBe(false);
  });
});
