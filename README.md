# fastify-webhook-verify

Multi-provider webhook signature verification for Fastify with replay protection and TypeScript support.

[![npm version](https://badge.fury.io/js/fastify-webhook-verify.svg)](https://www.npmjs.com/package/fastify-webhook-verify)
[![CI](https://github.com/fracabu/fastify-webhook-verify/actions/workflows/ci.yml/badge.svg)](https://github.com/fracabu/fastify-webhook-verify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Multi-provider support**: Stripe, GitHub, Twilio, Slack, Shopify out of the box
- **Custom providers**: Easy to add your own webhook providers
- **Replay protection**: Built-in protection against replay attacks with configurable tolerance
- **TypeScript-first**: Full type safety with TypeScript declarations
- **Fastify-native**: Uses Fastify's preHandler pattern for clean route integration
- **Automatic raw body handling**: Preserves raw body for signature verification

## Installation

```bash
npm install fastify-webhook-verify
```

## Quick Start

```typescript
import Fastify from 'fastify';
import webhookVerify from 'fastify-webhook-verify';

const fastify = Fastify({ logger: true });

await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    github: process.env.GITHUB_WEBHOOK_SECRET,
  },
});

// Stripe webhook endpoint
fastify.post('/webhooks/stripe', {
  preHandler: fastify.webhookVerify({ provider: 'stripe' }),
}, async (request) => {
  const { eventType, timestamp } = request.webhook!;
  console.log(`Received Stripe event: ${eventType}`);

  // Handle the webhook event
  return { received: true };
});

// GitHub webhook endpoint
fastify.post('/webhooks/github', {
  preHandler: fastify.webhookVerify({ provider: 'github' }),
}, async (request) => {
  console.log('Received GitHub webhook');
  return { received: true };
});

await fastify.listen({ port: 3000 });
```

## Supported Providers

| Provider | Algorithm | Signature Header | Timestamp |
|----------|-----------|------------------|-----------|
| Stripe | HMAC-SHA256 | `Stripe-Signature` | In header |
| GitHub | HMAC-SHA256 | `X-Hub-Signature-256` | - |
| Twilio | HMAC-SHA1 | `X-Twilio-Signature` | - |
| Slack | HMAC-SHA256 | `X-Slack-Signature` | `X-Slack-Request-Timestamp` |
| Shopify | HMAC-SHA256 | `X-Shopify-Hmac-SHA256` | - |

## Configuration

### Plugin Options

```typescript
interface FastifyWebhookVerifyOptions {
  // Provider secrets
  providers?: {
    stripe?: string;
    github?: string;
    twilio?: string;
    slack?: string;
    shopify?: string;
  };

  // Replay protection settings (default: enabled with 5 min tolerance)
  replayProtection?: {
    enabled: boolean;
    tolerance?: number; // seconds, default: 300
    storage?: ReplayStorage; // custom storage (e.g., Redis)
  };

  // Custom error handler
  errorHandler?: (error: Error, request: FastifyRequest, reply: FastifyReply) => void;

  // Hook called after successful verification
  onVerify?: (result: WebhookVerificationResult, request: FastifyRequest) => void;

  // Enable logging of verification attempts
  logAttempts?: boolean;
}
```

### Route Options

```typescript
interface WebhookRouteOptions {
  provider: 'stripe' | 'github' | 'twilio' | 'slack' | 'shopify' | 'custom';
  secret?: string; // Override global provider secret
  customConfig?: CustomProviderConfig; // For custom providers
  replayProtection?: Partial<ReplayProtectionConfig>; // Override per-route
}
```

## Examples

### Multiple Environments

```typescript
// Different secrets for live vs test
fastify.post('/webhooks/stripe/live', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    secret: process.env.STRIPE_LIVE_SECRET!,
  }),
}, handler);

fastify.post('/webhooks/stripe/test', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    secret: process.env.STRIPE_TEST_SECRET!,
  }),
}, handler);
```

### Custom Provider

```typescript
fastify.post('/webhooks/internal', {
  preHandler: fastify.webhookVerify({
    provider: 'custom',
    secret: process.env.INTERNAL_SECRET!,
    customConfig: {
      name: 'internal-service',
      signatureHeader: 'X-Internal-Signature',
      timestampHeader: 'X-Internal-Timestamp',
      algorithm: 'sha256',
      signatureEncoding: 'hex',
      buildPayload: (body, ts) => `${ts}.${body.toString()}`,
    },
  }),
}, handler);
```

### Custom Error Handler

```typescript
await fastify.register(webhookVerify, {
  providers: { stripe: process.env.STRIPE_WEBHOOK_SECRET },
  errorHandler: (error, request, reply) => {
    request.log.error({ err: error }, 'Webhook verification failed');

    // RFC 9457 Problem Details response
    reply.status(error.statusCode).send({
      type: `https://api.example.com/errors/${error.code.toLowerCase()}`,
      title: error.message,
      status: error.statusCode,
    });
  },
});
```

### Redis Storage for Replay Protection

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const redisStorage = {
  async has(nonce: string): Promise<boolean> {
    const exists = await redis.exists(`webhook:nonce:${nonce}`);
    return exists === 1;
  },
  async set(nonce: string, expiresAt: number): Promise<void> {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    await redis.setEx(`webhook:nonce:${nonce}`, ttl, '1');
  },
};

await fastify.register(webhookVerify, {
  providers: { stripe: process.env.STRIPE_WEBHOOK_SECRET },
  replayProtection: {
    enabled: true,
    tolerance: 300,
    storage: redisStorage,
  },
});
```

### Disable Replay Protection Per-Route

```typescript
fastify.post('/webhooks/stripe/idempotent', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    replayProtection: { enabled: false },
  }),
}, handler);
```

### Audit Logging Hook

```typescript
await fastify.register(webhookVerify, {
  providers: { stripe: process.env.STRIPE_WEBHOOK_SECRET },
  onVerify: async (result, request) => {
    await auditLog.record({
      timestamp: new Date(),
      provider: result.provider,
      eventType: result.eventType,
      success: result.valid,
      ip: request.ip,
    });
  },
});
```

## Accessing Webhook Data

After verification, webhook data is available on `request.webhook`:

```typescript
interface WebhookData {
  verified: boolean;
  provider: string;
  timestamp?: Date;
  rawBody: Buffer;
  eventType?: string;
}
```

## Error Types

The plugin exports typed error classes:

```typescript
import {
  WebhookError,
  MissingSignatureError,
  InvalidSignatureError,
  TimestampExpiredError,
  ReplayAttackError,
  MissingRawBodyError,
  UnknownProviderError,
  MissingSecretError,
} from 'fastify-webhook-verify';
```

## Requirements

- Node.js >= 20.0.0
- Fastify >= 5.0.0

## License

MIT
