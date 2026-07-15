import { env } from '../../config/env.js';

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function frontendUrl(): string {
  return env.FRONTEND_ORIGIN.split(',')[0]!.trim();
}

type LeadFields = {
  typeDemande: string;
  nom: string;
  telephone: string;
  email?: string | null;
  revenuMensuel?: number | null;
  scoreCredit?: number | null;
  dossierTal?: boolean | null;
  dateDemenagement?: string | null;
  message?: string | null;
};

function leadBodyLines(lead: LeadFields, listingAdresse?: string | null): string {
  const lines: string[] = [];
  lines.push(
    `<p><strong>Type :</strong> ${lead.typeDemande === 'prequal' ? 'Préqualification' : 'Rappel rapide'}</p>`,
  );
  lines.push(`<p><strong>Nom :</strong> ${esc(lead.nom)}</p>`);
  lines.push(`<p><strong>Téléphone :</strong> ${esc(lead.telephone)}</p>`);
  if (lead.email) lines.push(`<p><strong>Email :</strong> ${esc(lead.email)}</p>`);
  if (lead.revenuMensuel != null)
    lines.push(`<p><strong>Revenu mensuel :</strong> ${esc(lead.revenuMensuel)} $</p>`);
  if (lead.scoreCredit != null)
    lines.push(`<p><strong>Cote de crédit :</strong> ${esc(lead.scoreCredit)}</p>`);
  if (lead.typeDemande === 'prequal') {
    lines.push(
      `<p><strong>Dossier TAL :</strong> ${lead.dossierTal ? 'Oui' : 'Non'}</p>`,
    );
  }
  if (lead.dateDemenagement)
    lines.push(`<p><strong>Date déménagement :</strong> ${esc(lead.dateDemenagement)}</p>`);
  if (lead.message) lines.push(`<p><strong>Message :</strong> ${esc(lead.message)}</p>`);
  if (listingAdresse) lines.push(`<p><strong>Logement :</strong> ${esc(listingAdresse)}</p>`);
  return lines.join('\n');
}

export function leadReceivedAdmin(input: {
  lead: LeadFields;
  listingAdresse?: string | null;
  suggestedAgentName?: string | null;
}) {
  const { lead, listingAdresse, suggestedAgentName } = input;
  const subject = `Nouvelle demande — ${lead.nom}`;
  let body = leadBodyLines(lead, listingAdresse);
  if (suggestedAgentName) {
    body += `<p><strong>Agent suggéré :</strong> ${esc(suggestedAgentName)}</p>`;
  }
  if (env.FAST_RENTAL_APP_URL) {
    body += `<p><a href="${esc(env.FAST_RENTAL_APP_URL)}/app/demandes">Ouvrir les demandes</a></p>`;
  }
  const html = `<div style="font-family:sans-serif">${body}</div>`;
  const text = `Nouvelle demande — ${lead.nom}`;
  return { subject, html, text };
}

export function leadConfirmationClient(input: {
  nom: string;
  listingAdresse?: string | null;
  lang: 'fr' | 'en';
}) {
  const firstName = input.nom.split(/\s+/)[0] ?? input.nom;
  if (input.lang === 'en') {
    const listingPart = input.listingAdresse
      ? ` for the listing at ${input.listingAdresse}`
      : '';
    const subject = 'We have received your request';
    const html = `<div style="font-family:sans-serif"><p>Hi ${esc(firstName)},</p><p>We have received your request${listingPart ? esc(listingPart) : ''}. An agent will contact you within 24 hours (Mon–Fri). Thank you for your interest in LogiGo.</p></div>`;
    const text = html.replace(/<[^>]+>/g, ' ');
    return { subject, html, text };
  }
  const listingPart = input.listingAdresse ? ` pour le logement ${input.listingAdresse}` : '';
  const subject = 'Nous avons bien reçu votre demande';
  const html = `<div style="font-family:sans-serif"><p>Bonjour ${esc(firstName)},</p><p>Nous avons bien reçu votre demande${listingPart ? esc(listingPart) : ''}. Un agent vous contactera dans les 24 heures (lundi au vendredi). Merci de votre intérêt pour LogiGo.</p></div>`;
  const text = html.replace(/<[^>]+>/g, ' ');
  return { subject, html, text };
}
