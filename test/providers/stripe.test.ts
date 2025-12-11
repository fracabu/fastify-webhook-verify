import { describe, it, expect } from 'vitest';
import { StripeProvider } from '../../src/providers/stripe.js';
import { createStripeSignature, getCurrentTimestamp } from '../helpers.js';

describe('StripeProvider', () => {
  const provider = new StripeProvider();
  const secret = 'whsec_test_secret';

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(provider.name).toBe('stripe');
      expect(provider.signatureHeader).toBe('stripe-signature');
      expect(provider.algorithm).toBe('sha256');
      expect(provider.signatureEncoding).toBe('hex');
      expect(provider.timestampHeader).toBeUndefined();
    });
  });

  describe('extractSignature', () => {
    it('should extract v1 signature from header', () => {
      const header = 't=1234567890,v1=abc123def456';
      expect(provider.extractSignature(header)).toBe('abc123def456');
    });

    it('should handle multiple signatures', () => {
      const header = 't=1234567890,v0=old,v1=new123';
      expect(provider.extractSignature(header)).toBe('new123');
    });

    it('should throw on missing v1 signature', () => {
      const header = 't=1234567890,v0=abc123';
      expect(() => provider.extractSignature(header)).toThrow('No v1 signature found');
    });
  });

  describe('parseTimestamp', () => {
    it('should parse timestamp from header', () => {
      const header = 't=1234567890,v1=abc123';
      const timestamp = provider.parseTimestamp(header);
      expect(timestamp.getTime()).toBe(1234567890 * 1000);
    });

    it('should throw on missing timestamp', () => {
      const header = 'v1=abc123';
      expect(() => provider.parseTimestamp(header)).toThrow('No timestamp found');
    });
  });

  describe('computeSignature', () => {
    it('should compute correct signature', () => {
      const payload = '{"type":"test"}';
      const timestamp = new Date(1234567890 * 1000);

      const signature = provider.computeSignature(Buffer.from(payload), secret, timestamp);

      // Verify by computing manually
      const expected = createStripeSignature(payload, secret, 1234567890);
      const expectedSig = expected.split('v1=')[1];

      expect(signature).toBe(expectedSig);
    });

    it('should throw without timestamp', () => {
      const payload = '{"type":"test"}';
      expect(() => provider.computeSignature(Buffer.from(payload), secret)).toThrow(
        'Timestamp is required'
      );
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"type":"test"}';
      const timestamp = getCurrentTimestamp();
      const fullSig = createStripeSignature(payload, secret, timestamp);
      const signature = fullSig.split('v1=')[1];

      const expected = provider.computeSignature(
        Buffer.from(payload),
        secret,
        new Date(timestamp * 1000)
      );

      expect(provider.verifySignature(signature!, expected)).toBe(true);
    });

    it('should reject invalid signature', () => {
      // Use valid hex strings of same length but different content
      const sig1 = 'a'.repeat(64);
      const sig2 = 'b'.repeat(64);
      expect(provider.verifySignature(sig1, sig2)).toBe(false);
    });
  });

  describe('extractEventType', () => {
    it('should extract type from body', () => {
      expect(provider.extractEventType({ type: 'payment_intent.succeeded' })).toBe(
        'payment_intent.succeeded'
      );
    });

    it('should return undefined for missing type', () => {
      expect(provider.extractEventType({ id: 'evt_123' })).toBeUndefined();
    });

    it('should return undefined for non-string type', () => {
      expect(provider.extractEventType({ type: 123 })).toBeUndefined();
    });
  });
});
