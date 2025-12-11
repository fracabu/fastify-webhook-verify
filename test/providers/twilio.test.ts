import { describe, it, expect } from 'vitest';
import { TwilioProvider } from '../../src/providers/twilio.js';
import { createTwilioSignature } from '../helpers.js';

describe('TwilioProvider', () => {
  const provider = new TwilioProvider();
  const secret = 'twilio_auth_token';

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(provider.name).toBe('twilio');
      expect(provider.signatureHeader).toBe('x-twilio-signature');
      expect(provider.algorithm).toBe('sha1');
      expect(provider.signatureEncoding).toBe('base64');
      expect(provider.timestampHeader).toBeUndefined();
    });
  });

  describe('extractSignature', () => {
    it('should return header value as-is', () => {
      const header = 'abc123/+=';
      expect(provider.extractSignature(header)).toBe(header);
    });
  });

  describe('computeSignature', () => {
    it('should compute correct base64 SHA1 signature', () => {
      const payload = 'AccountSid=AC123&Body=Hello';

      const signature = provider.computeSignature(Buffer.from(payload), secret);
      const expected = createTwilioSignature(payload, secret);

      expect(signature).toBe(expected);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = 'test payload';
      const signature = createTwilioSignature(payload, secret);
      const expected = provider.computeSignature(Buffer.from(payload), secret);

      expect(provider.verifySignature(signature, expected)).toBe(true);
    });

    it('should reject invalid signature', () => {
      expect(provider.verifySignature('invalid', 'expected')).toBe(false);
    });
  });
});
