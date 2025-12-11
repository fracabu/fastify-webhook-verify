import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import webhookVerify from '../src/index.js';

const CUSTOM_SECRET = 'custom_webhook_secret';

function createCustomSignature(payload: string, secret: string, timestamp: number): string {
  const baseString = `${timestamp}.${payload}`;
  return createHmac('sha256', secret).update(baseString).digest('hex');
}

describe('Custom Provider', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('basic custom provider', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        replayProtection: { enabled: false },
      });

      fastify.post(
        '/webhook/custom',
        {
          preHandler: fastify.webhookVerify({
            provider: 'custom',
            secret: CUSTOM_SECRET,
            customConfig: {
              name: 'internal-service',
              signatureHeader: 'X-Custom-Signature',
              timestampHeader: 'X-Custom-Timestamp',
              algorithm: 'sha256',
              signatureEncoding: 'hex',
              buildPayload: (body, ts) => `${ts}.${body.toString()}`,
            },
          }),
        },
        async (request) => ({
          verified: request.webhook?.verified,
          provider: request.webhook?.provider,
        })
      );
    });

    it('should verify custom webhook', async () => {
      const payload = JSON.stringify({ event: 'user.created', userId: 123 });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createCustomSignature(payload, CUSTOM_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/custom',
        headers: {
          'content-type': 'application/json',
          'x-custom-signature': signature,
          'x-custom-timestamp': String(timestamp),
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        verified: true,
        provider: 'custom',
      });
    });

    it('should reject invalid custom signature', async () => {
      const payload = JSON.stringify({ event: 'user.created' });
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/custom',
        headers: {
          'content-type': 'application/json',
          'x-custom-signature': 'invalid_signature',
          'x-custom-timestamp': String(timestamp),
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('custom signature extractor', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        replayProtection: { enabled: false },
      });

      fastify.post(
        '/webhook/custom-extract',
        {
          preHandler: fastify.webhookVerify({
            provider: 'custom',
            secret: CUSTOM_SECRET,
            customConfig: {
              name: 'prefixed-service',
              signatureHeader: 'X-Prefixed-Signature',
              algorithm: 'sha256',
              signatureEncoding: 'hex',
              extractSignature: (header) => {
                const prefix = 'sig=';
                if (header.startsWith(prefix)) {
                  return header.slice(prefix.length);
                }
                throw new Error('Invalid signature format');
              },
            },
          }),
        },
        async (request) => ({
          verified: request.webhook?.verified,
        })
      );
    });

    it('should use custom signature extractor', async () => {
      const payload = JSON.stringify({ test: true });
      const signature = createHmac('sha256', CUSTOM_SECRET).update(payload).digest('hex');

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/custom-extract',
        headers: {
          'content-type': 'application/json',
          'x-prefixed-signature': `sig=${signature}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ verified: true });
    });

    it('should fail on invalid prefix', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/custom-extract',
        headers: {
          'content-type': 'application/json',
          'x-prefixed-signature': 'invalid_no_prefix',
        },
        payload: { test: true },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('base64 encoding', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        replayProtection: { enabled: false },
      });

      fastify.post(
        '/webhook/base64',
        {
          preHandler: fastify.webhookVerify({
            provider: 'custom',
            secret: CUSTOM_SECRET,
            customConfig: {
              name: 'base64-service',
              signatureHeader: 'X-Base64-Signature',
              algorithm: 'sha256',
              signatureEncoding: 'base64',
            },
          }),
        },
        async (request) => ({
          verified: request.webhook?.verified,
        })
      );
    });

    it('should verify base64 encoded signature', async () => {
      const payload = JSON.stringify({ data: 'test' });
      const signature = createHmac('sha256', CUSTOM_SECRET).update(payload).digest('base64');

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/base64',
        headers: {
          'content-type': 'application/json',
          'x-base64-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ verified: true });
    });
  });
});
