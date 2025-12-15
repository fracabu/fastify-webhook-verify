<h1 align="center">fastify-webhook-verify</h1>
<h3 align="center">Multi-provider webhook signature verification for Fastify</h3>

<p align="center">
  <em>Replay protection and TypeScript support</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/fastify-webhook-verify"><img src="https://img.shields.io/npm/v/fastify-webhook-verify.svg" alt="npm version" /></a>
  <img src="https://github.com/fracabu/fastify-webhook-verify/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify" alt="Fastify" />
</p>

<p align="center">
  :gb: <a href="#english">English</a> | :it: <a href="#italiano">Italiano</a>
</p>

---

## Overview

<!-- ![fastify-webhook-verify Overview](assets/webhook-overview.png) -->

---

<a name="english"></a>
## :gb: English

### Features

- **Multi-provider**: Stripe, GitHub, Twilio, Slack, Shopify out of the box
- **Custom providers**: Easy to add your own
- **Replay protection**: Built-in with configurable tolerance
- **TypeScript-first**: Full type safety
- **Fastify-native**: Uses preHandler pattern

### Supported Providers

| Provider | Algorithm | Signature Header |
|----------|-----------|------------------|
| Stripe | HMAC-SHA256 | `Stripe-Signature` |
| GitHub | HMAC-SHA256 | `X-Hub-Signature-256` |
| Twilio | HMAC-SHA1 | `X-Twilio-Signature` |
| Slack | HMAC-SHA256 | `X-Slack-Signature` |
| Shopify | HMAC-SHA256 | `X-Shopify-Hmac-SHA256` |

### Install

```bash
npm install fastify-webhook-verify
```

### Quick Start

```typescript
import Fastify from 'fastify'
import webhookVerify from 'fastify-webhook-verify'

const fastify = Fastify()

await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    github: process.env.GITHUB_WEBHOOK_SECRET
  }
})

fastify.post('/webhooks/stripe', {
  preHandler: fastify.webhookVerify({ provider: 'stripe' })
}, async (request) => {
  const { eventType } = request.webhook!
  console.log(`Received: ${eventType}`)
  return { received: true }
})
```

---

<a name="italiano"></a>
## :it: Italiano

### Funzionalita

- **Multi-provider**: Stripe, GitHub, Twilio, Slack, Shopify pronti all'uso
- **Provider personalizzati**: Facile aggiungere i propri
- **Protezione replay**: Integrata con tolleranza configurabile
- **TypeScript-first**: Piena type safety
- **Fastify-native**: Usa pattern preHandler

### Provider Supportati

| Provider | Algoritmo | Header Firma |
|----------|-----------|--------------|
| Stripe | HMAC-SHA256 | `Stripe-Signature` |
| GitHub | HMAC-SHA256 | `X-Hub-Signature-256` |
| Twilio | HMAC-SHA1 | `X-Twilio-Signature` |
| Slack | HMAC-SHA256 | `X-Slack-Signature` |
| Shopify | HMAC-SHA256 | `X-Shopify-Hmac-SHA256` |

### Installazione

```bash
npm install fastify-webhook-verify
```

### Provider Personalizzato

```typescript
fastify.post('/webhooks/internal', {
  preHandler: fastify.webhookVerify({
    provider: 'custom',
    secret: process.env.INTERNAL_SECRET!,
    customConfig: {
      name: 'internal-service',
      signatureHeader: 'X-Internal-Signature',
      algorithm: 'sha256'
    }
  })
}, handler)
```

---

## Requirements

- Node.js >= 20.0.0
- Fastify >= 5.0.0

## License

MIT

---

<p align="center">
  <a href="https://github.com/fracabu">
    <img src="https://img.shields.io/badge/Made_by-fracabu-8B5CF6?style=flat-square" alt="Made by fracabu" />
  </a>
</p>
