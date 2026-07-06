import './setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: sendMock },
  })),
}));

describe('email.service', () => {
  beforeEach(() => {
    sendMock.mockClear();
    vi.resetModules();
    process.env.EMAIL_ENABLED = 'false';
  });

  it('skips Resend when EMAIL_ENABLED=false', async () => {
    const { sendEmail } = await import('../src/modules/email/email.service.js');
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends admin and client templates through lead hooks when enabled', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'noreply@example.com';
    vi.resetModules();

    const { sendEmail, sendEmailToMany } = await import('../src/modules/email/email.service.js');
    const { leadConfirmationClient, leadReceivedAdmin } = await import('../src/modules/email/templates.js');

    await sendEmailToMany(['admin@example.com'], (to) => ({
      to,
      ...leadReceivedAdmin({
        lead: {
          typeDemande: 'rappel',
          nom: 'Jean',
          telephone: '5145551234',
          email: 'client@example.com',
        },
        listingAdresse: '100 Rue Test',
      }),
    }));

    await sendEmail({
      to: 'client@example.com',
      ...leadConfirmationClient({
        nom: 'Jean',
        listingAdresse: '100 Rue Test',
        lang: 'en',
      }),
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[1]?.[0]?.subject).toMatch(/received|merci|request/i);
  });

  it('does not throw when Resend rejects', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'noreply@example.com';
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'failed' } });
    vi.resetModules();

    const { sendEmail } = await import('../src/modules/email/email.service.js');
    await expect(
      sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).resolves.toBeUndefined();
  });
});
