import { describe, it, expect } from 'vitest';
import { ShopifyProvider } from '../../src/providers/shopify.js';
import { createShopifySignature } from '../helpers.js';

describe('ShopifyProvider', () => {
  const provider = new ShopifyProvider();
  const secret = 'shopify_api_secret';

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(provider.name).toBe('shopify');
      expect(provider.signatureHeader).toBe('x-shopify-hmac-sha256');
      expect(provider.algorithm).toBe('sha256');
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
    it('should compute correct base64 signature', () => {
      const payload = '{"id":123,"email":"test@example.com"}';

      const signature = provider.computeSignature(Buffer.from(payload), secret);

      const expected = createShopifySignature(payload, secret);

      expect(signature).toBe(expected);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"id":123}';
      const signature = createShopifySignature(payload, secret);
      const expected = provider.computeSignature(Buffer.from(payload), secret);

      expect(provider.verifySignature(signature, expected)).toBe(true);
    });

    it('should reject invalid signature', () => {
      expect(provider.verifySignature('invalid', 'expected')).toBe(false);
    });
  });

  describe('extractEventType', () => {
    it('should return undefined (topic is in header)', () => {
      expect(provider.extractEventType({ id: 123 })).toBeUndefined();
    });
  });
});
