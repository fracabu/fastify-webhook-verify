import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import webhookVerify from '../src/index.js';
import {
  createStripeSignature,
  createGitHubSignature,
  getCurrentTimestamp,
  getExpiredTimestamp,
} from './helpers.js';

const STRIPE_SECRET = 'whsec_test_secret_123';
const GITHUB_SECRET = 'github_test_secret_456';

describe('fastify-webhook-verify plugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('registration', () => {
    it('should register plugin successfully', async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
      });

      expect(fastify.webhookVerify).toBeDefined();
      expect(typeof fastify.webhookVerify).toBe('function');
    });

    it('should register with empty options', async () => {
      await fastify.register(webhookVerify, {});
      expect(fastify.webhookVerify).toBeDefined();
    });
  });

  describe('Stripe webhook verification', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
      });

      fastify.post(
        '/webhook/stripe',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async (request) => {
          return {
            verified: request.webhook?.verified,
            provider: request.webhook?.provider,
            eventType: request.webhook?.eventType,
          };
        }
      );
    });

    it('should verify valid Stripe webhook', async () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_123' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/stripe',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        verified: true,
        provider: 'stripe',
        eventType: 'payment_intent.succeeded',
      });
    });

    it('should reject invalid Stripe signature', async () => {
      const payload = JSON.stringify({ type: 'test' });
      const timestamp = getCurrentTimestamp();

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/stripe',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': `t=${timestamp},v1=invalid_signature`,
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing Stripe signature', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/stripe',
        headers: { 'content-type': 'application/json' },
        payload: { type: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject expired Stripe timestamp', async () => {
      const payload = JSON.stringify({ type: 'test' });
      const timestamp = getExpiredTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/stripe',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GitHub webhook verification', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { github: GITHUB_SECRET },
        replayProtection: { enabled: false },
      });

      fastify.post(
        '/webhook/github',
        {
          preHandler: fastify.webhookVerify({ provider: 'github' }),
        },
        async (request) => {
          return {
            verified: request.webhook?.verified,
            provider: request.webhook?.provider,
          };
        }
      );
    });

    it('should verify valid GitHub webhook', async () => {
      const payload = JSON.stringify({ action: 'opened', number: 1 });
      const signature = createGitHubSignature(payload, GITHUB_SECRET);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'pull_request',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        verified: true,
        provider: 'github',
      });
    });

    it('should reject invalid GitHub signature', async () => {
      const payload = JSON.stringify({ action: 'opened' });

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': 'sha256=invalid',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('inline secret', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {});

      fastify.post(
        '/webhook/stripe-inline',
        {
          preHandler: fastify.webhookVerify({
            provider: 'stripe',
            secret: STRIPE_SECRET,
          }),
        },
        async (request) => {
          return { verified: request.webhook?.verified };
        }
      );
    });

    it('should use inline secret for verification', async () => {
      const payload = JSON.stringify({ type: 'checkout.session.completed' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/stripe-inline',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ verified: true });
    });
  });

  describe('missing secret', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {});

      fastify.post(
        '/webhook/no-secret',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async () => {
          return { ok: true };
        }
      );
    });

    it('should throw error when secret is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/no-secret',
        headers: { 'content-type': 'application/json' },
        payload: { type: 'test' },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('custom error handler', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
        errorHandler: async (error, _request, reply) => {
          await reply.status(400).send({
            custom: true,
            code: (error as any).code,
          });
        },
      });

      fastify.post(
        '/webhook/custom-error',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async () => {
          return { ok: true };
        }
      );
    });

    it('should use custom error handler', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/custom-error',
        headers: { 'content-type': 'application/json' },
        payload: { type: 'test' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        custom: true,
        code: 'MISSING_SIGNATURE',
      });
    });
  });

  describe('onVerify hook', () => {
    let hookCalled = false;
    let hookResult: any = null;

    beforeEach(async () => {
      hookCalled = false;
      hookResult = null;

      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
        onVerify: async (result) => {
          hookCalled = true;
          hookResult = result;
        },
      });

      fastify.post(
        '/webhook/hook',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async () => {
          return { ok: true };
        }
      );
    });

    it('should call onVerify hook after successful verification', async () => {
      const payload = JSON.stringify({ type: 'invoice.paid' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook/hook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(hookCalled).toBe(true);
      expect(hookResult).toMatchObject({
        valid: true,
        provider: 'stripe',
        eventType: 'invoice.paid',
      });
    });
  });
});
