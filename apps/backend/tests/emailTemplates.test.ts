import './setup.js';
import { describe, expect, it } from 'vitest';
import { leadConfirmationClient, leadReceivedAdmin } from '../src/modules/email/templates.js';

describe('email template safety', () => {
  it('escapes HTML in admin notification bodies', () => {
    const { html } = leadReceivedAdmin({
      lead: {
        typeDemande: 'rappel',
        nom: '<script>alert(1)</script>',
        telephone: '5145551234',
        email: 'client@example.com',
        message: '"><img src=x onerror=alert(1)>',
      },
      listingAdresse: '<img src=x onerror=alert(1)>',
      suggestedAgentName: '<b>Agent</b>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;b&gt;Agent&lt;/b&gt;');
  });

  it('escapes listing addresses in French and English confirmations', () => {
    const fr = leadConfirmationClient({
      nom: 'Jean',
      listingAdresse: '<svg onload=alert(1)>',
      lang: 'fr',
    });
    expect(fr.html).toContain('&lt;svg onload=alert(1)&gt;');

    const en = leadConfirmationClient({
      nom: 'Jean',
      listingAdresse: '<svg onload=alert(1)>',
      lang: 'en',
    });
    expect(en.html).toContain('&lt;svg onload=alert(1)&gt;');
  });

  it('neutralizes SMTP header injection in subjects', () => {
    const { subject } = leadReceivedAdmin({
      lead: {
        typeDemande: 'rappel',
        nom: 'Jean\r\nBcc: attacker@evil.com',
        telephone: '5145551234',
      },
    });

    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('Jean');
  });

  it('only renders http(s) admin links', () => {
    const original = process.env.FAST_RENTAL_APP_URL;
    process.env.FAST_RENTAL_APP_URL = 'javascript:alert(1)';
    const { html } = leadReceivedAdmin({
      lead: {
        typeDemande: 'rappel',
        nom: 'Jean',
        telephone: '5145551234',
      },
    });
    expect(html).not.toContain('javascript:');
    process.env.FAST_RENTAL_APP_URL = original;
  });
});
