import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailToMany: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/modules/email/email.service.js', () => ({
  sendEmail: emailMocks.sendEmail,
  sendEmailToMany: emailMocks.sendEmailToMany,
}));

vi.mock('../src/modules/media/r2.service.js', () => ({
  signViewUrl: vi.fn().mockResolvedValue('https://signed.example/view'),
  signDownloadUrl: vi.fn().mockResolvedValue('https://signed.example/dl'),
  r2: {},
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) },
  })),
}));

import { app } from '../src/app.js';
import { supabaseAdmin } from '../src/db/supabaseAdmin.js';

const validAgentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const validListingId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function setupLeadMocks(options?: {
  agentActive?: boolean;
  listingExists?: boolean;
  listingAdresse?: string;
}) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const demandesChain = createThenableChain({ data: null, error: null });
  demandesChain.insert = insert;

  vi.mocked(supabaseAdmin.from).mockImplementation(
    mockSupabaseFrom({
      agents: () => {
        const chain = createThenableChain({ data: null, error: null });
        chain.maybeSingle = vi.fn(async () => ({
          data:
            options?.agentActive === false
              ? null
              : { id: validAgentId, nom: 'Agent Test', actif: true, email: 'admin@example.com' },
          error: null,
        }));
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        return chain;
      },
      logements: () => {
        const chain = createThenableChain({ data: null, error: null });
        chain.maybeSingle = vi.fn(async () => ({
          data:
            options?.listingExists === false
              ? null
              : {
                  id: validListingId,
                  adresse: options?.listingAdresse ?? '100 Rue Test',
                },
          error: null,
        }));
        return chain;
      },
      demandes_clients: () => demandesChain,
    }),
  );

  return { insert };
}

describe('POST /api/public/leads', () => {
  beforeEach(() => {
    emailMocks.sendEmail.mockClear();
    emailMocks.sendEmailToMany.mockClear();
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  it('returns 201 for valid rappel with logement_id columns', async () => {
    const { insert } = setupLeadMocks();
    const res = await request(app)
      .post('/api/public/leads')
      .send({
        typeDemande: 'rappel',
        nom: 'Jean',
        telephone: '5145551234',
        hp: '',
        listingId: validListingId,
        refAgentId: validAgentId,
        lang: 'fr',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.received).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type_demande: 'rappel',
        logement_id: validListingId,
        ref_agent_id: validAgentId,
        message: expect.stringContaining('Logement:'),
      }),
    );
  });

  it('returns 201 for honeypot without insert or email side effects', async () => {
    const { insert } = setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Bot',
      telephone: '5145551234',
      hp: 'filled',
      lang: 'fr',
    });
    expect(res.status).toBe(201);
    expect(insert).not.toHaveBeenCalled();
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(emailMocks.sendEmailToMany).not.toHaveBeenCalled();
  });

  it('rejects prequal without email or revenu', async () => {
    setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'prequal',
      nom: 'Test',
      telephone: '5145551234',
      revenuMensuel: 3000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects phone numbers shorter than 7 digits', async () => {
    setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Test',
      telephone: '12345',
    });
    expect(res.status).toBe(400);
  });

  it('stores inactive refAgentId as null', async () => {
    const { insert } = setupLeadMocks({ agentActive: false });
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Jean',
      telephone: '5145551234',
      refAgentId: validAgentId,
    });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ ref_agent_id: null }));
  });

  it('stores unknown listingId as null without Logement prefix', async () => {
    const { insert } = setupLeadMocks({ listingExists: false });
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Jean',
      telephone: '5145551234',
      listingId: validListingId,
      message: 'Bonjour',
    });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        logement_id: null,
        message: 'Bonjour',
      }),
    );
  });

  it('still returns 201 when email sending is mocked to reject', async () => {
    setupLeadMocks();
    emailMocks.sendEmailToMany.mockRejectedValueOnce(new Error('smtp down'));
    emailMocks.sendEmail.mockRejectedValueOnce(new Error('smtp down'));

    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Jean',
      telephone: '5145551234',
      email: 'client@example.com',
    });
    expect(res.status).toBe(201);
  });

  it('notifies each active admin via sendEmailToMany', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const demandesChain = createThenableChain({ data: null, error: null });
    demandesChain.insert = insert;

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        agents: () =>
          createThenableChain({
            data: [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }],
            error: null,
          }),
        demandes_clients: () => demandesChain,
      }),
    );

    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Jean',
      telephone: '5145551234',
      hp: '',
      lang: 'fr',
    });

    expect(res.status).toBe(201);
    expect(emailMocks.sendEmailToMany).toHaveBeenCalledWith(
      ['admin1@example.com', 'admin2@example.com'],
      expect.any(Function),
    );
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });

  it('skips leadConfirmationClient when prospect email is omitted', async () => {
    setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: 'Jean',
      telephone: '5145551234',
      hp: '',
      lang: 'fr',
    });
    expect(res.status).toBe(201);
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('lead rate limiting', () => {
  it('returns 429 after exceeding RATE_LIMIT_LEADS_MAX', async () => {
    setupLeadMocks();
    let lastStatus = 201;
    for (let i = 0; i < 21; i += 1) {
      const res = await request(app).post('/api/public/leads').send({
        typeDemande: 'rappel',
        nom: `User ${i}`,
        telephone: '5145551234',
        hp: 'filled',
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
