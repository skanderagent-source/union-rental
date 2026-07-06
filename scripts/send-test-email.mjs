import { config } from 'dotenv';
import { Resend } from 'resend';
import { resolve } from 'node:path';

config({ path: resolve('apps/backend/.env') });

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
const to = process.env.TEST_EMAIL_TO;

if (!apiKey) {
  console.error('Set RESEND_API_KEY in apps/backend/.env');
  process.exit(1);
}
if (!to) {
  console.error('Set TEST_EMAIL_TO in the environment');
  process.exit(1);
}

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from,
  to: [to],
  subject: 'Union Rental — test email',
  html: '<p>Ceci est un email de test depuis Union Rental.</p>',
  text: 'Ceci est un email de test depuis Union Rental.',
});

if (error) {
  console.error(error);
  process.exit(1);
}

console.log('Sent:', data?.id);
