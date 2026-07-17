import './setup.js';
import { describe, expect, it } from 'vitest';
import {
  sanitizeConfiguredEmailAddress,
  sanitizeEmailRecipient,
} from '../src/utils/emailSafe.js';

describe('emailSafe recipient validation', () => {
  it('accepts plain and display-name addresses', () => {
    expect(sanitizeEmailRecipient('client@example.com')).toBe('client@example.com');
    expect(sanitizeConfiguredEmailAddress('Union Rental <notifications@example.com>')).toBe(
      'Union Rental <notifications@example.com>',
    );
  });

  it('rejects CRLF header injection in recipients and configured addresses', () => {
    expect(sanitizeEmailRecipient('client@example.com\r\nBcc: evil@example.com')).toBeNull();
    expect(sanitizeConfiguredEmailAddress('Union\r\nBcc: evil@example.com')).toBeNull();
  });

  it('rejects malformed email addresses', () => {
    expect(sanitizeEmailRecipient('not-an-email')).toBeNull();
    expect(sanitizeConfiguredEmailAddress('not-an-email')).toBeNull();
  });
});
