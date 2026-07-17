import type { CreateLeadBody } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { sendEmail, sendEmailToMany } from '../email/email.service.js';
import { leadConfirmationClient, leadReceivedAdmin } from '../email/templates.js';
import { logger } from '../../config/logger.js';
import { logSecurityEvent } from '../../utils/securityEvents.js';
import { stripHtml } from '../../utils/sanitize.js';
import { toCreateLeadResponse } from '../../utils/publicResponses.js';

const LEAD_INSERT_ALLOWLIST = [
  'type_demande',
  'listing_id',
  'logement_id',
  'ref_agent_id',
  'nom',
  'telephone',
  'email',
  'statut',
  'revenu_mensuel',
  'score_credit',
  'date_demenagement',
  'message',
] as const;

type LeadInsertRow = Partial<Record<(typeof LEAD_INSERT_ALLOWLIST)[number], unknown>>;

function buildLeadInsertRow(values: LeadInsertRow): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const key of LEAD_INSERT_ALLOWLIST) {
    if (values[key] !== undefined) row[key] = values[key];
  }
  return row;
}

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

/** Fast Rental DemandesPanel renders `message` — mirror assign-email fields there. */
export function buildDemandMessage(input: {
  typeDemande: 'rappel' | 'prequal';
  listingAdresse: string | null;
  dossierTal?: boolean | null;
  revenuMensuel?: number | null;
  scoreCredit?: number | null;
  dateDemenagement?: string | null;
  userMessage: string;
}): string | null {
  const lines: string[] = [];
  lines.push(
    `Type: ${input.typeDemande === 'prequal' ? 'Préqualification' : 'Rappel rapide'}`,
  );
  if (input.listingAdresse) lines.push(`Logement: ${input.listingAdresse}`);
  if (input.typeDemande === 'prequal') {
    if (input.revenuMensuel != null) lines.push(`Revenu mensuel: ${input.revenuMensuel}$`);
    if (input.scoreCredit != null) lines.push(`Cote de crédit: ${input.scoreCredit}`);
    if (input.dossierTal !== undefined && input.dossierTal !== null) {
      lines.push(`Dossier TAL: ${input.dossierTal ? 'Oui' : 'Non'}`);
    }
    if (input.dateDemenagement) lines.push(`Date déménagement: ${input.dateDemenagement}`);
  }
  if (input.userMessage) lines.push(input.userMessage);
  return lines.length > 0 ? lines.join('\n') : null;
}

function isColumnCompatError(message: string | undefined) {
  return /logement_id|listing_id|column/i.test(message ?? '');
}

async function insertDemandRow(row: Record<string, unknown>): Promise<string> {
  const listingId = row.listing_id ?? null;
  const logementId = row.logement_id ?? null;
  const { logement_id: _legacy, listing_id: _canonical, ...base } = row;

  const attempts: Record<string, unknown>[] = [row];
  if (listingId && logementId) {
    attempts.push({ ...base, listing_id: listingId });
    attempts.push({ ...base, logement_id: logementId });
  } else if (listingId) {
    attempts.push({ ...base, listing_id: listingId });
  } else if (logementId) {
    attempts.push({ ...base, logement_id: logementId });
  }
  attempts.push(base);

  const seen = new Set<string>();
  let lastError: { message?: string } | null = null;

  for (const payload of attempts) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) continue;
    seen.add(key);

    const { data, error } = await supabaseAdmin
      .from('demandes_clients')
      .insert(payload)
      .select('id')
      .single();
    if (!error && data?.id) return data.id as string;
    lastError = error;
    if (!isColumnCompatError(error?.message)) break;
    logger.warn({ err: error, payloadKeys: Object.keys(payload) }, 'demandes_clients insert retry');
  }

  throw lastError ?? new Error('demandes_clients insert failed');
}

async function autoAssignReferralLead(leadId: string, agentId: string) {
  const { error } = await supabaseAdmin.rpc('assign_demande_client', {
    p_lead_id: leadId,
    p_agent_id: agentId,
    p_assignation_type: 'auto_referral',
  });
  if (error) {
    logger.warn({ err: error, leadId, agentId }, 'auto_referral assign failed');
  }
}

export async function createPublicLead(input: CreateLeadBody, req?: Pick<import('express').Request, 'method' | 'originalUrl' | 'ip'> & { id?: import('express').Request['id'] }) {
  if (input.hp) {
    logSecurityEvent('honeypot_triggered', req);
    logger.info('Honeypot triggered — skipping lead insert');
    return toCreateLeadResponse({ received: true });
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
  const composedMessage = buildDemandMessage({
    typeDemande: input.typeDemande,
    listingAdresse: listing.adresse,
    ...(input.typeDemande === 'prequal'
      ? {
          dossierTal: input.dossierTal ?? null,
          revenuMensuel: input.revenuMensuel ?? null,
          scoreCredit: input.scoreCredit ?? null,
        }
      : {}),
    dateDemenagement: input.dateDemenagement ?? null,
    userMessage,
  });

  const email = input.email?.trim() || null;

  const insertRow = buildLeadInsertRow({
    type_demande: input.typeDemande,
    listing_id: listing.id,
    logement_id: listing.id ?? undefined,
    ref_agent_id: validRefAgentId,
    nom,
    telephone,
    email,
    statut: 'nouveau',
    revenu_mensuel: input.typeDemande === 'prequal' ? input.revenuMensuel : null,
    score_credit: input.typeDemande === 'prequal' ? input.scoreCredit : null,
    date_demenagement: input.dateDemenagement ?? null,
    message: composedMessage,
  });

  const leadId = await insertDemandRow(insertRow);
  if (validRefAgentId) {
    await autoAssignReferralLead(leadId, validRefAgentId);
  }
  logger.info({ typeDemande: input.typeDemande, listingId: listing.id, leadId }, 'Lead stored in demandes_clients');

  const leadPayload = {
    typeDemande: input.typeDemande,
    nom,
    telephone,
    email,
    revenuMensuel: input.typeDemande === 'prequal' ? (input.revenuMensuel ?? null) : null,
    scoreCredit: input.typeDemande === 'prequal' ? (input.scoreCredit ?? null) : null,
    dossierTal: input.typeDemande === 'prequal' ? (input.dossierTal ?? false) : null,
    dateDemenagement: input.dateDemenagement ?? null,
    message: userMessage || null,
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

  return toCreateLeadResponse({ received: true });
}
