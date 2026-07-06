import type { CreateLeadBody } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { sendEmail, sendEmailToMany } from '../email/email.service.js';
import { leadConfirmationClient, leadReceivedAdmin } from '../email/templates.js';
import { logger } from '../../config/logger.js';

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
    .from('logements')
    .select('id,adresse')
    .eq('id', listingId)
    .maybeSingle();
  if (!data) return { id: null, adresse: null };
  return { id: data.id, adresse: data.adresse };
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

  const userMessage = input.message?.trim() ?? '';
  const composedMessage = listing.adresse
    ? `Logement: ${listing.adresse}\n${userMessage}`.trim()
    : userMessage || null;

  const email = input.email?.trim() || null;

  const { error } = await supabaseAdmin.from('demandes_clients').insert({
    type_demande: input.typeDemande,
    logement_id: listing.id,
    ref_agent_id: validRefAgentId,
    nom: input.nom,
    telephone: input.telephone,
    email,
    revenu_mensuel: input.typeDemande === 'prequal' ? input.revenuMensuel : null,
    dossier_tal: input.typeDemande === 'prequal' ? (input.dossierTal ?? false) : null,
    date_demenagement: input.dateDemenagement ?? null,
    message: composedMessage,
  });

  if (error) throw error;

  const leadPayload = {
    typeDemande: input.typeDemande,
    nom: input.nom,
    telephone: input.telephone,
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
        nom: input.nom,
        listingAdresse: listing.adresse,
        lang: input.lang ?? 'fr',
      }),
    });
  }

  return { received: true };
}
