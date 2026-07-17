import { env } from '../../config/env.js';
import {
  escEmailSubject,
  escHtml,
  escPlainText,
  htmlEmailDocument,
  htmlToPlainText,
  safeHttpHref,
} from '../../utils/emailSafe.js';

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

function leadTypeLabel(typeDemande: string): string {
  return typeDemande === 'prequal' ? 'Préqualification' : 'Rappel rapide';
}

function leadBodyLines(lead: LeadFields, listingAdresse?: string | null): string {
  const lines: string[] = [];
  lines.push(`<p><strong>Type :</strong> ${escHtml(leadTypeLabel(lead.typeDemande))}</p>`);
  lines.push(`<p><strong>Nom :</strong> ${escHtml(lead.nom)}</p>`);
  lines.push(`<p><strong>Téléphone :</strong> ${escHtml(lead.telephone)}</p>`);
  if (lead.email) lines.push(`<p><strong>Email :</strong> ${escHtml(lead.email)}</p>`);
  if (lead.revenuMensuel != null) {
    lines.push(`<p><strong>Revenu mensuel :</strong> ${escHtml(lead.revenuMensuel)} $</p>`);
  }
  if (lead.scoreCredit != null) {
    lines.push(`<p><strong>Cote de crédit :</strong> ${escHtml(lead.scoreCredit)}</p>`);
  }
  if (lead.typeDemande === 'prequal') {
    lines.push(`<p><strong>Dossier TAL :</strong> ${lead.dossierTal ? 'Oui' : 'Non'}</p>`);
  }
  if (lead.dateDemenagement) {
    lines.push(`<p><strong>Date déménagement :</strong> ${escHtml(lead.dateDemenagement)}</p>`);
  }
  if (lead.message) lines.push(`<p><strong>Message :</strong> ${escHtml(lead.message)}</p>`);
  if (listingAdresse) lines.push(`<p><strong>Logement :</strong> ${escHtml(listingAdresse)}</p>`);
  return lines.join('\n');
}

export function leadReceivedAdmin(input: {
  lead: LeadFields;
  listingAdresse?: string | null;
  suggestedAgentName?: string | null;
}) {
  const { lead, listingAdresse, suggestedAgentName } = input;
  const subject = escEmailSubject(`Nouvelle demande — ${lead.nom}`);
  let body = leadBodyLines(lead, listingAdresse);
  if (suggestedAgentName) {
    body += `<p><strong>Agent suggéré :</strong> ${escHtml(suggestedAgentName)}</p>`;
  }

  const demandesUrl = env.FAST_RENTAL_APP_URL
    ? safeHttpHref(`${env.FAST_RENTAL_APP_URL.replace(/\/$/, '')}/app/demandes`)
    : null;
  if (demandesUrl) {
    body += `<p><a href="${demandesUrl}">Ouvrir les demandes</a></p>`;
  }

  const html = htmlEmailDocument(body);
  const text = escPlainText(`Nouvelle demande — ${lead.nom}`);
  return { subject, html, text };
}

export function leadConfirmationClient(input: {
  nom: string;
  listingAdresse?: string | null;
  lang: 'fr' | 'en';
}) {
  const firstName = escHtml(input.nom.split(/\s+/)[0] ?? input.nom);

  if (input.lang === 'en') {
    const listingPart = input.listingAdresse
      ? ` for the listing at ${escHtml(input.listingAdresse)}`
      : '';
    const subject = escEmailSubject('We have received your request');
    const html = htmlEmailDocument(
      `<p>Hi ${firstName},</p><p>We have received your request${listingPart}. An agent will contact you within 24 hours (Mon–Fri). Thank you for your interest in LogiGo.</p>`,
    );
    return { subject, html, text: htmlToPlainText(html) };
  }

  const listingPart = input.listingAdresse
    ? ` pour le logement ${escHtml(input.listingAdresse)}`
    : '';
  const subject = escEmailSubject('Nous avons bien reçu votre demande');
  const html = htmlEmailDocument(
    `<p>Bonjour ${firstName},</p><p>Nous avons bien reçu votre demande${listingPart}. Un agent vous contactera dans les 24 heures (lundi au vendredi). Merci de votre intérêt pour LogiGo.</p>`,
  );
  return { subject, html, text: htmlToPlainText(html) };
}

export { frontendUrl };
