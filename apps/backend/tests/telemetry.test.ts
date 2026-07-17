import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('client telemetry', () => {
  it('accepts web-vital reports', async () => {
    const res = await request(app)
      .post('/api/public/telemetry')
      .set('Content-Type', 'application/json')
      .send({
        kind: 'web-vital',
        name: 'LCP',
        pathname: '/',
        value: 1200,
        rating: 'good',
      });

    expect(res.status).toBe(204);
  });

  it('accepts client-error reports', async () => {
    const res = await request(app)
      .post('/api/public/telemetry')
      .set('Content-Type', 'application/json')
      .send({
        kind: 'client-error',
        name: 'react_render_error',
        pathname: '/inventaire',
        message: 'Test error',
      });

    expect(res.status).toBe(204);
  });

  it('rejects invalid telemetry payloads', async () => {
    const res = await request(app)
      .post('/api/public/telemetry')
      .set('Content-Type', 'application/json')
      .send({ kind: 'invalid', name: '' });

    expect(res.status).toBe(400);
  });
});
