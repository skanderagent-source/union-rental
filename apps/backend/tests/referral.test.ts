import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createThenableChain, mockSupabaseFrom } from './helpers/supabaseMock.js';

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import { supabaseAdmin } from '../src/db/supabaseAdmin.js';
import { resolveReferralSlug } from '../src/modules/referral/referral.service.js';

describe('resolveReferralSlug', () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  it('resolves alphanumeric referral_slug', async () => {
    const slugChain = createThenableChain({ data: null, error: null });
    slugChain.maybeSingle = vi.fn(async () => ({
      data: { id: 'agent-1', nom: 'Agent', actif: true },
      error: null,
    }));

    vi.mocked(supabaseAdmin.from).mockImplementation(
      mockSupabaseFrom({
        agents: () => slugChain,
      }),
    );

    const result = await resolveReferralSlug('frenki');
    expect(result.agentId).toBe('agent-1');
  });

  it('rejects usernames with dots or symbols', async () => {
    await expect(resolveReferralSlug('frenki.pocari')).rejects.toMatchObject({ status: 404 });
  });
});
