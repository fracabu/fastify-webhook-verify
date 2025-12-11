import { describe, it, expect } from 'vitest';
import { SlackProvider } from '../../src/providers/slack.js';
import { createSlackSignature, getCurrentTimestamp } from '../helpers.js';

describe('SlackProvider', () => {
  const provider = new SlackProvider();
  const secret = 'slack_signing_secret';

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(provider.name).toBe('slack');
      expect(provider.signatureHeader).toBe('x-slack-signature');
      expect(provider.timestampHeader).toBe('x-slack-request-timestamp');
      expect(provider.algorithm).toBe('sha256');
      expect(provider.signatureEncoding).toBe('hex');
    });
  });

  describe('extractSignature', () => {
    it('should extract signature from header', () => {
      const header = 'v0=abc123def456';
      expect(provider.extractSignature(header)).toBe('abc123def456');
    });

    it('should throw on invalid format', () => {
      expect(() => provider.extractSignature('invalid')).toThrow('Invalid Slack signature format');
    });
  });

  describe('parseTimestamp', () => {
    it('should parse timestamp from header', () => {
      const timestamp = provider.parseTimestamp('1234567890');
      expect(timestamp.getTime()).toBe(1234567890 * 1000);
    });
  });

  describe('computeSignature', () => {
    it('should compute correct signature', () => {
      const payload = '{"type":"event_callback"}';
      const timestamp = new Date(1234567890 * 1000);

      const signature = provider.computeSignature(
        Buffer.from(payload),
        secret,
        timestamp
      );

      const fullSig = createSlackSignature(payload, secret, 1234567890);
      const expected = fullSig.slice('v0='.length);

      expect(signature).toBe(expected);
    });

    it('should throw without timestamp', () => {
      expect(() =>
        provider.computeSignature(Buffer.from('{}'), secret)
      ).toThrow('Timestamp is required');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"type":"event_callback"}';
      const timestamp = getCurrentTimestamp();
      const fullSig = createSlackSignature(payload, secret, timestamp);
      const signature = fullSig.slice('v0='.length);

      const expected = provider.computeSignature(
        Buffer.from(payload),
        secret,
        new Date(timestamp * 1000)
      );

      expect(provider.verifySignature(signature, expected)).toBe(true);
    });
  });

  describe('extractEventType', () => {
    it('should extract type from body', () => {
      expect(provider.extractEventType({ type: 'event_callback' }))
        .toBe('event_callback');
    });

    it('should return undefined for missing type', () => {
      expect(provider.extractEventType({ data: {} })).toBeUndefined();
    });
  });
});
