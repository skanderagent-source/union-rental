import { isValidReferralUsername, normalizeReferralUsername } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { notFound } from '../../utils/httpErrors.js';

export async function resolveReferralSlug(slug: string) {
  const normalized = normalizeReferralUsername(slug);
  if (!isValidReferralUsername(normalized)) throw notFound('Lien agent invalide');

  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('id,nom,actif')
    .eq('referral_slug', normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.actif) throw notFound('Agent introuvable');

  return { agentId: data.id as string, nom: data.nom as string };
}
