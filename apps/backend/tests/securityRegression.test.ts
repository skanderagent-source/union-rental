import './setup.js';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('security regression suite', () => {
  it('does not expose auth or admin routes', async () => {
    const paths = [
      '/api/public/login',
      '/api/public/auth/session',
      '/admin',
      '/debug',
      '/metrics',
    ];

    for (const path of paths) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('denies cross-origin GET responses for untrusted origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not set Access-Control-Allow-Credentials', async () => {
    const res = await request(app)
      .options('/api/public/listings')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('marks public API responses as non-cacheable', async () => {
    const res = await request(app).get('/api/public/listings/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers.pragma).toBe('no-cache');
  });

  it('returns generic lead success payloads without account enumeration hints', async () => {
    const honeypot = await request(app)
      .post('/api/public/leads')
      .send({
        typeDemande: 'rappel',
        nom: 'Test User',
        telephone: '5145551234',
        hp: 'bot',
      });

    expect(honeypot.status).toBe(201);
    expect(honeypot.body.data).toEqual({ received: true });
    expect(JSON.stringify(honeypot.body)).not.toMatch(/honeypot|bot|spam/i);
  });

  it('does not include stack traces in API error responses', async () => {
    const res = await request(app).get('/api/public/listings?page=1&page=2');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at /i);
  });
});
