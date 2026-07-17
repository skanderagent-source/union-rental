import { isValidReferralUsername, normalizeReferralUsername } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { throwIfDatabaseError } from '../../utils/databaseError.js';
import { notFound } from '../../utils/httpErrors.js';
import { toReferralAgentResponse } from '../../utils/publicResponses.js';

export async function resolveReferralSlug(slug: string) {
  if (!isValidReferralUsername(slug)) throw notFound('Lien agent invalide');
  const normalized = normalizeReferralUsername(slug);

  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('id,nom,actif')
    .eq('referral_slug', normalized)
    .maybeSingle();
  throwIfDatabaseError(error);
  if (!data || !data.actif) throw notFound('Agent introuvable');

  return toReferralAgentResponse({ agentId: data.id as string, nom: data.nom as string });
}
