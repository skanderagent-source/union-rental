import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { sanitizeEmailRecipient } from '../../utils/emailSafe.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(input: EmailInput): Promise<void> {
  if (!env.EMAIL_ENABLED || !resend) {
    logger.info({ subject: input.subject }, 'EMAIL_ENABLED=false — email skipped');
    return;
  }

  const recipient = sanitizeEmailRecipient(input.to);
  if (!recipient) {
    logger.warn({ subject: input.subject }, 'Skipped email with invalid recipient');
    return;
  }

  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: env.EMAIL_FROM!,
      to: [recipient],
      subject: input.subject,
      html: input.html,
      text: input.text,
    };
    if (env.EMAIL_REPLY_TO) payload.replyTo = env.EMAIL_REPLY_TO;
    const { error } = await resend.emails.send(payload);
    if (error) logger.error({ error: { message: error.message }, subject: input.subject }, 'Resend send failed');
  } catch (err) {
    logger.error({ err: err instanceof Error ? { name: err.name, message: err.message } : err, subject: input.subject }, 'Resend send threw');
  }
}

export async function sendEmailToMany(
  recipients: string[],
  build: (to: string) => EmailInput,
): Promise<void> {
  await Promise.allSettled(recipients.map((to) => sendEmail(build(to))));
}
