import type { CreateLeadBody } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { sendEmail, sendEmailToMany } from '../email/email.service.js';
import { leadConfirmationClient, leadReceivedAdmin } from '../email/templates.js';
import { logger } from '../../config/logger.js';
import { stripHtml } from '../../utils/sanitize.js';

async function validateRefAgent(refAgentId: string | null | undefined): Promise<string | null> {
  if (!refAgentId) return null;
  const { data } = await supabaseAdmin
    .from('agents')
    .select('id,nom,actif')
    .eq('id', refAgentId)
    .maybeSingle();
  if (!data || !data.actif) return null;
  return data.id;
}

async function validateListing(listingId: string | null | undefined): Promise<{
  id: string | null;
  adresse: string | null;
}> {
  if (!listingId) return { id: null, adresse: null };

  const { data } = await supabaseAdmin
    .from('public_available_listings')
    .select('id,adresse')
    .eq('id', listingId)
    .maybeSingle();
  if (data) return { id: data.id, adresse: data.adresse };

  const { data: fallback } = await supabaseAdmin
    .from('logements')
    .select('id,adresse')
    .eq('id', listingId)
    .is('deleted_at', null)
    .maybeSingle();
  if (fallback) return { id: fallback.id, adresse: fallback.adresse };

  return { id: null, adresse: null };
}

export async function createPublicLead(input: CreateLeadBody) {
  if (input.hp) {
    logger.info('Honeypot triggered — skipping lead insert');
    return { received: true };
  }

  const validRefAgentId = await validateRefAgent(input.refAgentId);
  const listing = await validateListing(input.listingId);

  let suggestedAgentName: string | null = null;
  if (validRefAgentId) {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('nom')
      .eq('id', validRefAgentId)
      .maybeSingle();
    suggestedAgentName = agent?.nom ?? null;
  }

  const nom = stripHtml(input.nom);
  const telephone = stripHtml(input.telephone);
  const userMessage = input.message ? stripHtml(input.message) : '';
  const messageLines: string[] = [];
  if (listing.adresse) messageLines.push(`Logement: ${listing.adresse}`);
  if (input.typeDemande === 'prequal' && input.dossierTal !== undefined && input.dossierTal !== null) {
    messageLines.push(`Dossier TAL: ${input.dossierTal ? 'Oui' : 'Non'}`);
  }
  if (userMessage) messageLines.push(userMessage);
  const composedMessage = messageLines.length > 0 ? messageLines.join('\n') : null;

  const email = input.email?.trim() || null;

  const insertRow: Record<string, unknown> = {
    type_demande: input.typeDemande,
    listing_id: listing.id,
    ref_agent_id: validRefAgentId,
    nom,
    telephone,
    email,
    statut: 'nouveau',
    revenu_mensuel: input.typeDemande === 'prequal' ? input.revenuMensuel : null,
    date_demenagement: input.dateDemenagement ?? null,
    message: composedMessage,
  };

  if (listing.id) {
    insertRow.logement_id = listing.id;
  }

  let { error } = await supabaseAdmin.from('demandes_clients').insert(insertRow);
  if (error && listing.id && /logement_id/i.test(error.message ?? '')) {
    const { logement_id: _legacy, ...withoutLegacy } = insertRow;
    ({ error } = await supabaseAdmin.from('demandes_clients').insert(withoutLegacy));
  }

  if (error) throw error;

  const leadPayload = {
    typeDemande: input.typeDemande,
    nom,
    telephone,
    email,
    revenuMensuel: input.typeDemande === 'prequal' ? (input.revenuMensuel ?? null) : null,
    dossierTal: input.typeDemande === 'prequal' ? (input.dossierTal ?? false) : null,
    dateDemenagement: input.dateDemenagement ?? null,
    message: composedMessage,
  };

  const { data: admins } = await supabaseAdmin
    .from('agents')
    .select('email')
    .eq('role', 'admin')
    .eq('actif', true);

  const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean);

  void sendEmailToMany(adminEmails, (to) => ({
    to,
    ...leadReceivedAdmin({
      lead: leadPayload,
      listingAdresse: listing.adresse,
      suggestedAgentName,
    }),
  }));

  if (email) {
    void sendEmail({
      to: email,
      ...leadConfirmationClient({
        nom,
        listingAdresse: listing.adresse,
        lang: input.lang ?? 'fr',
      }),
    });
  }

  return { received: true };
}
