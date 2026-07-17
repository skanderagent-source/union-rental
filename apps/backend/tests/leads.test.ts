import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
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
import { buildDemandMessage } from '../src/modules/leads/leads.service.js';

const validAgentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const validListingId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const validLeadId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function mockLeadInsert() {
  return vi.fn(() => {
    const chain = createThenableChain({ data: { id: validLeadId }, error: null });
    chain.select = vi.fn(() => chain);
    chain.single = vi.fn(async () => ({ data: { id: validLeadId }, error: null }));
    return chain;
  });
}

function setupLeadMocks(options?: {
  agentActive?: boolean;
  listingExists?: boolean;
  listingAdresse?: string;
}) {
  const insert = mockLeadInsert();
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
      public_available_listings: () => {
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
        chain.is = vi.fn(() => chain);
        return chain;
      },
      demandes_clients: () => demandesChain,
    }),
  );

  return { insert };
}

describe('buildDemandMessage', () => {
  it('includes prequal fields for Fast Rental Demandes panel', () => {
    const message = buildDemandMessage({
      typeDemande: 'prequal',
      listingAdresse: '100 Rue Test',
      revenuMensuel: 3500,
      scoreCredit: 720,
      dossierTal: true,
      dateDemenagement: '2026-08-01',
      userMessage: 'Famille de 3',
    });
    expect(message).toContain('Type: Préqualification');
    expect(message).toContain('Revenu mensuel: 3500$');
    expect(message).toContain('Cote de crédit: 720');
    expect(message).toContain('Dossier TAL: Oui');
    expect(message).toContain('Date déménagement: 2026-08-01');
    expect(message).toContain('Famille de 3');
  });
});

describe('POST /api/public/leads', () => {
  beforeEach(() => {
    emailMocks.sendEmail.mockClear();
    emailMocks.sendEmailToMany.mockClear();
    vi.mocked(supabaseAdmin.from).mockReset();
    vi.mocked(supabaseAdmin.rpc).mockClear();
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: null });
  });

  it('returns 201 for valid rappel with listing_id column', async () => {
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
        listing_id: validListingId,
        logement_id: validListingId,
        ref_agent_id: validAgentId,
        statut: 'nouveau',
        message: expect.stringMatching(/Type: Rappel rapide[\s\S]*Logement:/),
      }),
    );
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('assign_demande_client', {
      p_lead_id: validLeadId,
      p_agent_id: validAgentId,
      p_assignation_type: 'auto_referral',
    });
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

  it('stores unavailable listingId as null without Logement prefix', async () => {
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
        listing_id: null,
        statut: 'nouveau',
        message: expect.stringMatching(/Type: Rappel rapide[\s\S]*Bonjour/),
      }),
    );
  });

  it('strips HTML from nom, telephone, and message', async () => {
    const { insert } = setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'rappel',
      nom: '<b>Jean</b>',
      telephone: '<script>5145551234</script>',
      message: '<p>Bonjour</p>',
      hp: '',
      lang: 'fr',
    });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nom: 'Jean',
        telephone: '5145551234',
        message: expect.stringMatching(/Type: Rappel rapide[\s\S]*Bonjour/),
      }),
    );
  });

  it('stores prequal dossier TAL in message (shared schema has no dossier_tal column)', async () => {
    const { insert } = setupLeadMocks();
    const res = await request(app).post('/api/public/leads').send({
      typeDemande: 'prequal',
      nom: 'Marie',
      telephone: '5145551234',
      email: 'marie@example.com',
      revenuMensuel: 3500,
      scoreCredit: 720,
      dossierTal: true,
      hp: '',
      lang: 'fr',
    });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        revenu_mensuel: 3500,
        score_credit: 720,
        message: expect.stringMatching(
          /Type: Préqualification[\s\S]*Revenu mensuel: 3500\$[\s\S]*Cote de crédit: 720[\s\S]*Dossier TAL: Oui/,
        ),
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.not.objectContaining({ dossier_tal: expect.anything() }),
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
    const insert = mockLeadInsert();
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

  it('includes Retry-After on 429 responses', async () => {
    setupLeadMocks();
    let limited: Awaited<ReturnType<typeof request>> | null = null;
    for (let i = 0; i < 21; i += 1) {
      const res = await request(app).post('/api/public/leads').send({
        typeDemande: 'rappel',
        nom: `Retry User ${i}`,
        telephone: '5145551234',
        hp: 'filled',
      });
      if (res.status === 429) {
        limited = res;
        break;
      }
    }

    expect(limited).not.toBeNull();
    expect(limited!.headers['retry-after']).toMatch(/^\d+$/);
    expect(Number(limited!.headers['retry-after'])).toBeGreaterThan(0);
  });
});
