import { describe, it, expect } from 'vitest';
import { GitHubProvider } from '../../src/providers/github.js';
import { createGitHubSignature } from '../helpers.js';

describe('GitHubProvider', () => {
  const provider = new GitHubProvider();
  const secret = 'github_secret_123';

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(provider.name).toBe('github');
      expect(provider.signatureHeader).toBe('x-hub-signature-256');
      expect(provider.algorithm).toBe('sha256');
      expect(provider.signatureEncoding).toBe('hex');
      expect(provider.timestampHeader).toBeUndefined();
    });
  });

  describe('extractSignature', () => {
    it('should extract signature from header', () => {
      const header = 'sha256=abc123def456';
      expect(provider.extractSignature(header)).toBe('abc123def456');
    });

    it('should throw on invalid format', () => {
      expect(() => provider.extractSignature('invalid')).toThrow('Invalid GitHub signature format');
    });

    it('should throw on wrong prefix', () => {
      expect(() => provider.extractSignature('sha1=abc123')).toThrow(
        'Invalid GitHub signature format'
      );
    });
  });

  describe('computeSignature', () => {
    it('should compute correct signature', () => {
      const payload = '{"action":"opened"}';

      const signature = provider.computeSignature(Buffer.from(payload), secret);

      const fullSig = createGitHubSignature(payload, secret);
      const expected = fullSig.slice('sha256='.length);

      expect(signature).toBe(expected);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"action":"opened"}';
      const fullSig = createGitHubSignature(payload, secret);
      const signature = fullSig.slice('sha256='.length);

      const expected = provider.computeSignature(Buffer.from(payload), secret);

      expect(provider.verifySignature(signature, expected)).toBe(true);
    });

    it('should reject invalid signature', () => {
      // Use valid hex strings of same length but different content
      const sig1 = 'a'.repeat(64);
      const sig2 = 'b'.repeat(64);
      expect(provider.verifySignature(sig1, sig2)).toBe(false);
    });
  });

  describe('extractEventType', () => {
    it('should return undefined (event type is in header)', () => {
      expect(provider.extractEventType({ action: 'opened' })).toBeUndefined();
    });
  });
});
