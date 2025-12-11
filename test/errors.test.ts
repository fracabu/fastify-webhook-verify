import { describe, it, expect } from 'vitest';
import {
  WebhookError,
  MissingSignatureError,
  InvalidSignatureError,
  TimestampExpiredError,
  ReplayAttackError,
  MissingRawBodyError,
  UnknownProviderError,
  MissingSecretError,
} from '../src/errors.js';

describe('Error Classes', () => {
  describe('WebhookError', () => {
    it('should create base error', () => {
      const error = new WebhookError('TEST_CODE', 'Test message', 400, 'test-provider');

      expect(error.name).toBe('WebhookError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.provider).toBe('test-provider');
      expect(error.stack).toBeDefined();
    });

    it('should default to 401 status code', () => {
      const error = new WebhookError('CODE', 'Message');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('MissingSignatureError', () => {
    it('should create with provider name', () => {
      const error = new MissingSignatureError('stripe');

      expect(error.name).toBe('MissingSignatureError');
      expect(error.code).toBe('MISSING_SIGNATURE');
      expect(error.message).toContain('stripe');
      expect(error.statusCode).toBe(401);
      expect(error.provider).toBe('stripe');
    });
  });

  describe('InvalidSignatureError', () => {
    it('should create with provider name', () => {
      const error = new InvalidSignatureError('github');

      expect(error.name).toBe('InvalidSignatureError');
      expect(error.code).toBe('INVALID_SIGNATURE');
      expect(error.message).toContain('github');
      expect(error.statusCode).toBe(401);
      expect(error.provider).toBe('github');
    });
  });

  describe('TimestampExpiredError', () => {
    it('should create with timestamp and tolerance', () => {
      const timestamp = new Date();
      const error = new TimestampExpiredError('slack', timestamp, 300);

      expect(error.name).toBe('TimestampExpiredError');
      expect(error.code).toBe('TIMESTAMP_EXPIRED');
      expect(error.message).toContain('slack');
      expect(error.statusCode).toBe(401);
      expect(error.provider).toBe('slack');
      expect(error.timestamp).toBe(timestamp);
      expect(error.tolerance).toBe(300);
    });
  });

  describe('ReplayAttackError', () => {
    it('should create with provider name', () => {
      const error = new ReplayAttackError('shopify');

      expect(error.name).toBe('ReplayAttackError');
      expect(error.code).toBe('REPLAY_ATTACK');
      expect(error.message).toContain('shopify');
      expect(error.statusCode).toBe(401);
      expect(error.provider).toBe('shopify');
    });
  });

  describe('MissingRawBodyError', () => {
    it('should create without provider', () => {
      const error = new MissingRawBodyError();

      expect(error.name).toBe('MissingRawBodyError');
      expect(error.code).toBe('MISSING_RAW_BODY');
      expect(error.message).toContain('Raw body');
      expect(error.statusCode).toBe(500);
      expect(error.provider).toBeUndefined();
    });
  });

  describe('UnknownProviderError', () => {
    it('should create with provider name', () => {
      const error = new UnknownProviderError('unknown');

      expect(error.name).toBe('UnknownProviderError');
      expect(error.code).toBe('UNKNOWN_PROVIDER');
      expect(error.message).toContain('unknown');
      expect(error.statusCode).toBe(400);
      expect(error.provider).toBe('unknown');
    });
  });

  describe('MissingSecretError', () => {
    it('should create with provider name', () => {
      const error = new MissingSecretError('twilio');

      expect(error.name).toBe('MissingSecretError');
      expect(error.code).toBe('MISSING_SECRET');
      expect(error.message).toContain('twilio');
      expect(error.statusCode).toBe(500);
      expect(error.provider).toBe('twilio');
    });
  });

  describe('instanceof checks', () => {
    it('all errors should be instances of WebhookError', () => {
      expect(new MissingSignatureError('test')).toBeInstanceOf(WebhookError);
      expect(new InvalidSignatureError('test')).toBeInstanceOf(WebhookError);
      expect(new TimestampExpiredError('test', new Date(), 300)).toBeInstanceOf(WebhookError);
      expect(new ReplayAttackError('test')).toBeInstanceOf(WebhookError);
      expect(new MissingRawBodyError()).toBeInstanceOf(WebhookError);
      expect(new UnknownProviderError('test')).toBeInstanceOf(WebhookError);
      expect(new MissingSecretError('test')).toBeInstanceOf(WebhookError);
    });

    it('all errors should be instances of Error', () => {
      expect(new WebhookError('CODE', 'msg')).toBeInstanceOf(Error);
      expect(new MissingSignatureError('test')).toBeInstanceOf(Error);
    });
  });
});
