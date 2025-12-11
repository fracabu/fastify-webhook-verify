import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import webhookVerify from '../src/index.js';
import { createStripeSignature, getCurrentTimestamp } from './helpers.js';

const STRIPE_SECRET = 'whsec_replay_test';

describe('Replay Protection', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('duplicate detection', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
        replayProtection: { enabled: true, tolerance: 300 },
      });

      fastify.post(
        '/webhook',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async () => ({ received: true })
      );
    });

    it('should accept first webhook', async () => {
      const payload = JSON.stringify({ type: 'test', id: 'evt_unique_1' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject duplicate webhook with same signature', async () => {
      const payload = JSON.stringify({ type: 'test', id: 'evt_duplicate' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      // First request - should succeed
      const response1 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response1.statusCode).toBe(200);

      // Second request with same signature - should fail
      const response2 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response2.statusCode).toBe(401);
    });

    it('should accept different webhooks', async () => {
      const payload1 = JSON.stringify({ type: 'test', id: 'evt_1' });
      const payload2 = JSON.stringify({ type: 'test', id: 'evt_2' });
      const timestamp = getCurrentTimestamp();

      const sig1 = createStripeSignature(payload1, STRIPE_SECRET, timestamp);
      const sig2 = createStripeSignature(payload2, STRIPE_SECRET, timestamp);

      const response1 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': sig1,
        },
        payload: payload1,
      });

      const response2 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': sig2,
        },
        payload: payload2,
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
    });
  });

  describe('disabled replay protection', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
        replayProtection: { enabled: false },
      });

      fastify.post(
        '/webhook',
        {
          preHandler: fastify.webhookVerify({ provider: 'stripe' }),
        },
        async () => ({ received: true })
      );
    });

    it('should accept duplicate webhooks when disabled', async () => {
      const payload = JSON.stringify({ type: 'test' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response1 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      const response2 = await fastify.inject({
        method: 'POST',
        url: '/webhook',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
    });
  });

  describe('per-route override', () => {
    beforeEach(async () => {
      await fastify.register(webhookVerify, {
        providers: { stripe: STRIPE_SECRET },
        replayProtection: { enabled: true, tolerance: 300 },
      });

      // Route with replay protection disabled
      fastify.post(
        '/webhook/no-replay',
        {
          preHandler: fastify.webhookVerify({
            provider: 'stripe',
            replayProtection: { enabled: false },
          }),
        },
        async () => ({ received: true })
      );
    });

    it('should allow duplicate when per-route override disables replay protection', async () => {
      const payload = JSON.stringify({ type: 'test' });
      const timestamp = getCurrentTimestamp();
      const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

      const response1 = await fastify.inject({
        method: 'POST',
        url: '/webhook/no-replay',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      const response2 = await fastify.inject({
        method: 'POST',
        url: '/webhook/no-replay',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
    });
  });
});
