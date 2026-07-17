import './setup.js';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { httpLogger } from '../src/config/httpLogger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { HttpError } from '../src/utils/httpErrors.js';

describe('observability and error safety', () => {
  it('returns a request id header on API responses', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('health endpoint stays minimal and uncacheable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(Object.keys(res.body)).toEqual(['ok']);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('does not leak internal error details on 500 responses', async () => {
    const probe = express();
    probe.use(httpLogger);
    probe.get('/boom', (_req, _res, next) => {
      next(new Error('select * from secret_table failed at /srv/app'));
    });
    probe.use(errorHandler);

    const res = await request(probe).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Erreur serveur' } });
    expect(JSON.stringify(res.body)).not.toContain('secret_table');
    expect(JSON.stringify(res.body)).not.toContain('/srv/app');
  });

  it('maps database errors to generic 500 responses', async () => {
    const { throwIfDatabaseError } = await import('../src/utils/databaseError.js');
    expect(() =>
      throwIfDatabaseError({ message: 'relation "agents" does not exist', code: '42P01' }),
    ).toThrow(HttpError);
    try {
      throwIfDatabaseError({ message: 'relation "agents" does not exist', code: '42P01' });
    } catch (error) {
      expect(error).toMatchObject({ status: 500, code: 'INTERNAL' });
    }
  });

  it('returns JSON 404 for unknown API routes without static fallthrough', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
