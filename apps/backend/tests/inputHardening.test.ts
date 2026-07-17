import './setup.js';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { containsPollutionKeys, escapeIlikePattern } from '../src/utils/sanitize.js';

describe('input and transport hardening', () => {
  it('rejects duplicate query parameters', async () => {
    const res = await request(app).get('/api/public/listings?page=1&page=2');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects ambiguous request paths', async () => {
    const res = await request(app).get('/api//public/listings');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects non-JSON lead submissions', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .set('Content-Type', 'text/plain')
      .send('not-json');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects compressed request bodies', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send('{"typeDemande":"rappel","nom":"Test","telephone":"5145551234"}');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects unknown lead fields to prevent mass assignment', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({
        typeDemande: 'rappel',
        nom: 'Test User',
        telephone: '5145551234',
        statut: 'admin',
        role: 'admin',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects prototype pollution keys in JSON bodies', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .set('Content-Type', 'application/json')
      .send('{"typeDemande":"rappel","nom":"Test","telephone":"5145551234","__proto__":{"polluted":true}}');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates listing id params as UUIDs', async () => {
    const res = await request(app).get('/api/public/listings/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects path traversal in media object keys', async () => {
    const res = await request(app).get('/api/public/media/object?key=..%2F..%2Fetc%2Fpasswd');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('escapes ilike wildcards in search terms', () => {
    expect(escapeIlikePattern('100%_test')).toBe('100\\%\\_test');
  });

  it('detects pollution keys recursively', () => {
    expect(containsPollutionKeys({ safe: { constructor: { polluted: true } } })).toBe(true);
    expect(containsPollutionKeys({ nom: 'ok', telephone: '5145551234' })).toBe(false);
  });

  it('ignores single-character search queries to reduce expensive scans', async () => {
    const { publicListingsQuerySchema } = await import('@union-rental/shared');
    expect(publicListingsQuerySchema.parse({ q: 'a' }).q).toBeUndefined();
    expect(publicListingsQuerySchema.parse({ q: 'ab' }).q).toBe('ab');
  });
});
