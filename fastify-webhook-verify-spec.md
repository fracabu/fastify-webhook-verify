# Specifiche: fastify-webhook-verify

Plugin Fastify per la verifica delle webhook multi-provider con protezione replay attack e TypeScript-first.

---

## 1. Metadata Progetto

```yaml
name: fastify-webhook-verify
version: 1.0.0
description: Multi-provider webhook signature verification for Fastify with replay protection and TypeScript support
license: MIT
author: fracabu
keywords:
  - fastify
  - fastify-plugin
  - webhook
  - signature
  - verification
  - stripe
  - github
  - twilio
  - slack
  - shopify
  - security
engines:
  node: ">=20.0.0"
type: module
```

---

## 2. Analisi di Mercato

### 2.1 Competitor Esistenti

| Package | Downloads/week | Ultimo Update | Fastify Plugin | TypeScript |
|---------|----------------|---------------|----------------|------------|
| `webhook-verify-all` | 2 | 2023 | No | No |
| `svix` | 15,000 | Attivo | No | Si |
| Provider SDKs (stripe, etc) | Vari | Attivo | No | Vari |

### 2.2 Gap Identificati

Nessuna soluzione esistente offre:
- Plugin Fastify nativo con preHandler pattern
- Supporto multi-provider unificato
- Protezione replay attack integrata
- TypeScript-first con tipi per ogni provider
- Raw body preservation automatica per Fastify

### 2.3 Differenziazione

| Feature | Provider SDKs | svix | webhook-verify-all | Nostro |
|---------|---------------|------|---------------------|--------|
| Fastify-native | No | No | No | Si |
| Multi-provider | No | Solo svix | Si | Si |
| Replay protection | Manuale | Si | No | Si |
| TypeScript-first | Vario | Si | No | Si |
| Raw body handling | Manuale | Manuale | Manuale | Automatico |
| preHandler pattern | No | No | No | Si |

---

## 3. Provider Supportati

### 3.1 Priorità Alta (v1.0)

| Provider | Algoritmo | Header Signature | Header Timestamp |
|----------|-----------|------------------|------------------|
| **Stripe** | HMAC-SHA256 | `Stripe-Signature` | Incluso nel header |
| **GitHub** | HMAC-SHA256 | `X-Hub-Signature-256` | - |
| **Twilio** | HMAC-SHA1 | `X-Twilio-Signature` | - |
| **Slack** | HMAC-SHA256 | `X-Slack-Signature` | `X-Slack-Request-Timestamp` |
| **Shopify** | HMAC-SHA256 | `X-Shopify-Hmac-SHA256` | - |

### 3.2 Priorità Media (v1.1)

| Provider | Algoritmo | Note |
|----------|-----------|------|
| **Paddle** | HMAC-SHA256 | E-commerce |
| **Clerk** | Svix-based | Auth provider |
| **Resend** | HMAC-SHA256 | Email |
| **Linear** | HMAC-SHA256 | Project management |

### 3.3 Priorità Bassa (v1.2+)

| Provider | Note |
|----------|------|
| **Discord** | Bot webhooks |
| **Typeform** | Forms |
| **Calendly** | Scheduling |
| **SendGrid** | Email |

---

## 4. Struttura Directory

```
fastify-webhook-verify/
├── src/
│   ├── index.ts              # Entry point, export plugin
│   ├── plugin.ts             # Implementazione plugin principale
│   ├── types.ts              # TypeScript types/interfaces
│   ├── providers/
│   │   ├── index.ts          # Export tutti i provider
│   │   ├── base.ts           # Provider base class
│   │   ├── stripe.ts         # Stripe provider
│   │   ├── github.ts         # GitHub provider
│   │   ├── twilio.ts         # Twilio provider
│   │   ├── slack.ts          # Slack provider
│   │   └── shopify.ts        # Shopify provider
│   ├── replay-protection.ts  # Replay attack prevention
│   ├── errors.ts             # Errori custom
│   └── utils.ts              # Utility functions
├── test/
│   ├── plugin.test.ts        # Test plugin integration
│   ├── providers/
│   │   ├── stripe.test.ts
│   │   ├── github.test.ts
│   │   ├── twilio.test.ts
│   │   ├── slack.test.ts
│   │   └── shopify.test.ts
│   ├── replay.test.ts        # Test replay protection
│   └── helpers.ts            # Test utilities
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── LICENSE
└── CHANGELOG.md
```

---

## 5. TypeScript Types

### 5.1 Opzioni Plugin

```typescript
// src/types.ts

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Provider supportati
 */
export type WebhookProvider =
  | 'stripe'
  | 'github'
  | 'twilio'
  | 'slack'
  | 'shopify'
  | 'custom';

/**
 * Configurazione per provider custom
 */
export interface CustomProviderConfig {
  /** Nome del provider per logging */
  name: string;
  /** Header contenente la firma */
  signatureHeader: string;
  /** Header contenente il timestamp (opzionale) */
  timestampHeader?: string;
  /** Algoritmo HMAC */
  algorithm: 'sha1' | 'sha256' | 'sha512';
  /** Funzione per estrarre la firma dall'header */
  extractSignature?: (headerValue: string) => string;
  /** Funzione per costruire il payload da firmare */
  buildPayload?: (rawBody: Buffer, timestamp?: string) => string;
  /** Encoding della firma */
  signatureEncoding?: 'hex' | 'base64';
}

/**
 * Configurazione replay protection
 */
export interface ReplayProtectionConfig {
  /** Abilita protezione replay */
  enabled: boolean;
  /** Tolleranza timestamp in secondi (default: 300 = 5 minuti) */
  tolerance?: number;
  /** Storage per nonces (default: in-memory) */
  storage?: ReplayStorage;
}

/**
 * Interface per storage replay protection
 */
export interface ReplayStorage {
  /** Verifica se un nonce esiste già */
  has(nonce: string): Promise<boolean>;
  /** Salva un nonce */
  set(nonce: string, expiresAt: number): Promise<void>;
  /** Rimuovi nonces scaduti */
  cleanup?(): Promise<void>;
}

/**
 * Risultato della verifica
 */
export interface WebhookVerificationResult {
  /** Se la verifica è riuscita */
  valid: boolean;
  /** Provider che ha verificato */
  provider: WebhookProvider;
  /** Timestamp della webhook (se disponibile) */
  timestamp?: Date;
  /** Motivo del fallimento */
  error?: string;
  /** Event type (se disponibile dal provider) */
  eventType?: string;
}

/**
 * Hook chiamato dopo la verifica
 */
export type WebhookVerifyHook = (
  result: WebhookVerificationResult,
  request: FastifyRequest
) => void | Promise<void>;

/**
 * Handler errori custom
 */
export type WebhookErrorHandler = (
  error: WebhookError,
  request: FastifyRequest,
  reply: FastifyReply
) => void | Promise<void>;

/**
 * Opzioni per route singola
 */
export interface WebhookRouteOptions {
  /** Provider per questa route */
  provider: WebhookProvider;
  /** Secret per questo provider */
  secret: string;
  /** Configurazione custom provider */
  customConfig?: CustomProviderConfig;
  /** Override replay protection */
  replayProtection?: Partial<ReplayProtectionConfig>;
}

/**
 * Opzioni del plugin
 */
export interface FastifyWebhookVerifyOptions {
  /**
   * Configurazione provider (secret per provider)
   */
  providers?: {
    stripe?: string;
    github?: string;
    twilio?: string;
    slack?: string;
    shopify?: string;
    [key: string]: string | undefined;
  };

  /**
   * Configurazione replay protection globale
   * @default { enabled: true, tolerance: 300 }
   */
  replayProtection?: ReplayProtectionConfig;

  /**
   * Handler errori custom
   */
  errorHandler?: WebhookErrorHandler;

  /**
   * Hook post-verifica
   */
  onVerify?: WebhookVerifyHook;

  /**
   * Se true, logga i tentativi di verifica
   * @default false
   */
  logAttempts?: boolean;
}

/**
 * Dati webhook disponibili nella request
 */
export interface WebhookData {
  /** Se la webhook è stata verificata */
  verified: boolean;
  /** Provider usato */
  provider: WebhookProvider;
  /** Timestamp originale */
  timestamp?: Date;
  /** Raw body della request */
  rawBody: Buffer;
  /** Event type (se disponibile) */
  eventType?: string;
}
```

### 5.2 Errori Custom

```typescript
// src/errors.ts

export class WebhookError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly provider?: string;

  constructor(code: string, message: string, statusCode: number = 401, provider?: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
    this.statusCode = statusCode;
    this.provider = provider;
  }
}

export class MissingSignatureError extends WebhookError {
  constructor(provider: string) {
    super(
      'MISSING_SIGNATURE',
      `Missing webhook signature header for ${provider}`,
      401,
      provider
    );
  }
}

export class InvalidSignatureError extends WebhookError {
  constructor(provider: string) {
    super(
      'INVALID_SIGNATURE',
      `Invalid webhook signature for ${provider}`,
      401,
      provider
    );
  }
}

export class TimestampExpiredError extends WebhookError {
  public readonly timestamp: Date;
  public readonly tolerance: number;

  constructor(provider: string, timestamp: Date, tolerance: number) {
    super(
      'TIMESTAMP_EXPIRED',
      `Webhook timestamp expired for ${provider}`,
      401,
      provider
    );
    this.timestamp = timestamp;
    this.tolerance = tolerance;
  }
}

export class ReplayAttackError extends WebhookError {
  constructor(provider: string) {
    super(
      'REPLAY_ATTACK',
      `Duplicate webhook detected for ${provider}`,
      401,
      provider
    );
  }
}

export class MissingRawBodyError extends WebhookError {
  constructor() {
    super(
      'MISSING_RAW_BODY',
      'Raw body is required for webhook verification. Ensure rawBody parser is enabled.',
      500
    );
  }
}

export class UnknownProviderError extends WebhookError {
  constructor(provider: string) {
    super(
      'UNKNOWN_PROVIDER',
      `Unknown webhook provider: ${provider}`,
      400,
      provider
    );
  }
}
```

### 5.3 Augmentation Fastify

```typescript
// src/types.ts (continua)

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * PreHandler per verificare webhook
     */
    webhookVerify: (options: WebhookRouteOptions) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    /**
     * Dati webhook (disponibile dopo verifica)
     */
    webhook?: WebhookData;

    /**
     * Raw body della request
     */
    rawBody?: Buffer;
  }
}
```

---

## 6. Implementazione Core

### 6.1 Entry Point

```typescript
// src/index.ts

import fp from 'fastify-plugin';
import { fastifyWebhookVerifyPlugin } from './plugin.js';
import type { FastifyWebhookVerifyOptions } from './types.js';

export { FastifyWebhookVerifyOptions } from './types.js';
export * from './errors.js';
export * from './providers/index.js';

export default fp<FastifyWebhookVerifyOptions>(fastifyWebhookVerifyPlugin, {
  fastify: '5.x',
  name: 'fastify-webhook-verify'
});
```

### 6.2 Plugin Principale

```typescript
// src/plugin.ts

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  FastifyWebhookVerifyOptions,
  WebhookRouteOptions,
  WebhookData,
  ReplayProtectionConfig
} from './types.js';
import { getProvider } from './providers/index.js';
import { createReplayProtection } from './replay-protection.js';
import {
  MissingSignatureError,
  InvalidSignatureError,
  MissingRawBodyError,
  ReplayAttackError,
  TimestampExpiredError
} from './errors.js';

const DEFAULT_REPLAY_PROTECTION: ReplayProtectionConfig = {
  enabled: true,
  tolerance: 300 // 5 minuti
};

export async function fastifyWebhookVerifyPlugin(
  fastify: FastifyInstance,
  options: FastifyWebhookVerifyOptions
): Promise<void> {
  const {
    providers = {},
    replayProtection = DEFAULT_REPLAY_PROTECTION,
    errorHandler,
    onVerify,
    logAttempts = false
  } = options;

  // Setup replay protection
  const replayGuard = replayProtection.enabled
    ? createReplayProtection(replayProtection)
    : null;

  // Decorator per dati webhook
  fastify.decorateRequest('webhook', null);
  fastify.decorateRequest('rawBody', null);

  // Raw body parser - preserva il body originale
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as any).rawBody = body;
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Funzione guard principale
  const createVerifyHandler = (routeOptions: WebhookRouteOptions) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const { provider: providerName, secret, customConfig } = routeOptions;

      // 1. Verifica raw body
      const rawBody = (request as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        const error = new MissingRawBodyError();
        if (errorHandler) {
          return errorHandler(error, request, reply);
        }
        throw error;
      }

      // 2. Ottieni provider
      const provider = getProvider(providerName, customConfig);

      // 3. Estrai firma
      const signatureHeader = request.headers[provider.signatureHeader.toLowerCase()];
      if (!signatureHeader) {
        const error = new MissingSignatureError(providerName);
        if (logAttempts) {
          request.log.warn({ provider: providerName }, 'Missing webhook signature');
        }
        if (errorHandler) {
          return errorHandler(error, request, reply);
        }
        throw error;
      }

      // 4. Estrai timestamp (se supportato)
      let timestamp: Date | undefined;
      if (provider.timestampHeader) {
        const tsHeader = request.headers[provider.timestampHeader.toLowerCase()];
        if (tsHeader) {
          timestamp = provider.parseTimestamp(tsHeader as string);
        }
      }

      // 5. Verifica timestamp (replay protection)
      const rpConfig = { ...replayProtection, ...routeOptions.replayProtection };
      if (rpConfig.enabled && timestamp) {
        const now = Date.now();
        const webhookTime = timestamp.getTime();
        const tolerance = (rpConfig.tolerance || 300) * 1000;

        if (Math.abs(now - webhookTime) > tolerance) {
          const error = new TimestampExpiredError(
            providerName,
            timestamp,
            rpConfig.tolerance || 300
          );
          if (logAttempts) {
            request.log.warn({ provider: providerName, timestamp }, 'Webhook timestamp expired');
          }
          if (errorHandler) {
            return errorHandler(error, request, reply);
          }
          throw error;
        }
      }

      // 6. Verifica firma
      const signature = provider.extractSignature(signatureHeader as string);
      const expectedSignature = provider.computeSignature(rawBody, secret, timestamp);

      const isValid = provider.verifySignature(signature, expectedSignature);

      if (!isValid) {
        const error = new InvalidSignatureError(providerName);
        if (logAttempts) {
          request.log.warn({ provider: providerName }, 'Invalid webhook signature');
        }
        if (errorHandler) {
          return errorHandler(error, request, reply);
        }
        throw error;
      }

      // 7. Verifica replay (nonce check)
      if (replayGuard && timestamp) {
        const nonce = `${providerName}:${signature}:${timestamp.getTime()}`;
        const isDuplicate = await replayGuard.check(nonce);

        if (isDuplicate) {
          const error = new ReplayAttackError(providerName);
          if (logAttempts) {
            request.log.warn({ provider: providerName }, 'Duplicate webhook detected');
          }
          if (errorHandler) {
            return errorHandler(error, request, reply);
          }
          throw error;
        }

        await replayGuard.record(nonce);
      }

      // 8. Popola request con dati webhook
      const eventType = provider.extractEventType?.(request.body as Record<string, unknown>);

      const webhookData: WebhookData = {
        verified: true,
        provider: providerName,
        timestamp,
        rawBody,
        eventType
      };

      request.webhook = webhookData;

      // 9. Hook post-verifica
      if (onVerify) {
        await onVerify(
          {
            valid: true,
            provider: providerName,
            timestamp,
            eventType
          },
          request
        );
      }

      if (logAttempts) {
        request.log.info({ provider: providerName, eventType }, 'Webhook verified successfully');
      }
    };
  };

  // Decorate fastify instance
  fastify.decorate('webhookVerify', (routeOptions: WebhookRouteOptions) => {
    // Se il secret non è passato, cerca nei providers globali
    if (!routeOptions.secret && providers[routeOptions.provider]) {
      routeOptions.secret = providers[routeOptions.provider]!;
    }
    return createVerifyHandler(routeOptions);
  });
}
```

### 6.3 Provider Base

```typescript
// src/providers/base.ts

import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookProviderConfig {
  name: string;
  signatureHeader: string;
  timestampHeader?: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  signatureEncoding: 'hex' | 'base64';
}

export abstract class BaseProvider {
  constructor(protected config: WebhookProviderConfig) {}

  get signatureHeader(): string {
    return this.config.signatureHeader;
  }

  get timestampHeader(): string | undefined {
    return this.config.timestampHeader;
  }

  /**
   * Estrae la firma dall'header
   */
  abstract extractSignature(headerValue: string): string;

  /**
   * Parsa il timestamp dall'header
   */
  parseTimestamp(headerValue: string): Date {
    const ts = parseInt(headerValue, 10);
    return new Date(ts * 1000);
  }

  /**
   * Calcola la firma attesa
   */
  abstract computeSignature(
    rawBody: Buffer,
    secret: string,
    timestamp?: Date
  ): string;

  /**
   * Verifica la firma in modo timing-safe
   */
  verifySignature(provided: string, expected: string): boolean {
    try {
      const providedBuf = Buffer.from(provided, this.config.signatureEncoding);
      const expectedBuf = Buffer.from(expected, this.config.signatureEncoding);

      if (providedBuf.length !== expectedBuf.length) {
        return false;
      }

      return timingSafeEqual(providedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Estrae l'event type dal body (opzionale)
   */
  extractEventType?(body: Record<string, unknown>): string | undefined;

  /**
   * Helper per creare HMAC
   */
  protected createHmac(payload: string, secret: string): string {
    return createHmac(this.config.algorithm, secret)
      .update(payload)
      .digest(this.config.signatureEncoding);
  }
}
```

### 6.4 Provider Stripe

```typescript
// src/providers/stripe.ts

import { BaseProvider } from './base.js';

export class StripeProvider extends BaseProvider {
  constructor() {
    super({
      name: 'stripe',
      signatureHeader: 'Stripe-Signature',
      algorithm: 'sha256',
      signatureEncoding: 'hex'
    });
  }

  /**
   * Stripe usa formato: t=timestamp,v1=signature
   */
  extractSignature(headerValue: string): string {
    const parts = headerValue.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'v1') {
        return value;
      }
    }
    throw new Error('No v1 signature found in Stripe-Signature header');
  }

  /**
   * Override parseTimestamp per Stripe (usa t= nel header)
   */
  parseTimestamp(headerValue: string): Date {
    const parts = headerValue.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        return new Date(parseInt(value, 10) * 1000);
      }
    }
    throw new Error('No timestamp found in Stripe-Signature header');
  }

  /**
   * Stripe: payload = timestamp.body
   */
  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (!timestamp) {
      throw new Error('Timestamp is required for Stripe webhook verification');
    }
    const ts = Math.floor(timestamp.getTime() / 1000);
    const payload = `${ts}.${rawBody.toString()}`;
    return this.createHmac(payload, secret);
  }

  extractEventType(body: Record<string, unknown>): string | undefined {
    return body.type as string | undefined;
  }
}
```

### 6.5 Provider GitHub

```typescript
// src/providers/github.ts

import { BaseProvider } from './base.js';

export class GitHubProvider extends BaseProvider {
  constructor() {
    super({
      name: 'github',
      signatureHeader: 'X-Hub-Signature-256',
      algorithm: 'sha256',
      signatureEncoding: 'hex'
    });
  }

  /**
   * GitHub usa formato: sha256=signature
   */
  extractSignature(headerValue: string): string {
    const prefix = 'sha256=';
    if (headerValue.startsWith(prefix)) {
      return headerValue.slice(prefix.length);
    }
    throw new Error('Invalid GitHub signature format');
  }

  /**
   * GitHub: payload = raw body
   */
  computeSignature(rawBody: Buffer, secret: string): string {
    return this.createHmac(rawBody.toString(), secret);
  }

  extractEventType(body: Record<string, unknown>): string | undefined {
    // GitHub event type è nell'header X-GitHub-Event, non nel body
    return undefined;
  }
}
```

### 6.6 Provider Slack

```typescript
// src/providers/slack.ts

import { BaseProvider } from './base.js';

export class SlackProvider extends BaseProvider {
  constructor() {
    super({
      name: 'slack',
      signatureHeader: 'X-Slack-Signature',
      timestampHeader: 'X-Slack-Request-Timestamp',
      algorithm: 'sha256',
      signatureEncoding: 'hex'
    });
  }

  /**
   * Slack usa formato: v0=signature
   */
  extractSignature(headerValue: string): string {
    const prefix = 'v0=';
    if (headerValue.startsWith(prefix)) {
      return headerValue.slice(prefix.length);
    }
    throw new Error('Invalid Slack signature format');
  }

  /**
   * Slack: payload = v0:timestamp:body
   */
  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (!timestamp) {
      throw new Error('Timestamp is required for Slack webhook verification');
    }
    const ts = Math.floor(timestamp.getTime() / 1000);
    const payload = `v0:${ts}:${rawBody.toString()}`;
    return this.createHmac(payload, secret);
  }

  extractEventType(body: Record<string, unknown>): string | undefined {
    return body.type as string | undefined;
  }
}
```

### 6.7 Provider Shopify

```typescript
// src/providers/shopify.ts

import { BaseProvider } from './base.js';

export class ShopifyProvider extends BaseProvider {
  constructor() {
    super({
      name: 'shopify',
      signatureHeader: 'X-Shopify-Hmac-SHA256',
      algorithm: 'sha256',
      signatureEncoding: 'base64'
    });
  }

  /**
   * Shopify: firma diretta in base64
   */
  extractSignature(headerValue: string): string {
    return headerValue;
  }

  /**
   * Shopify: payload = raw body
   */
  computeSignature(rawBody: Buffer, secret: string): string {
    return this.createHmac(rawBody.toString(), secret);
  }

  extractEventType(body: Record<string, unknown>): string | undefined {
    // Shopify topic è nell'header X-Shopify-Topic
    return undefined;
  }
}
```

### 6.8 Provider Twilio

```typescript
// src/providers/twilio.ts

import { BaseProvider } from './base.js';

export class TwilioProvider extends BaseProvider {
  constructor() {
    super({
      name: 'twilio',
      signatureHeader: 'X-Twilio-Signature',
      algorithm: 'sha1',
      signatureEncoding: 'base64'
    });
  }

  /**
   * Twilio: firma diretta in base64
   */
  extractSignature(headerValue: string): string {
    return headerValue;
  }

  /**
   * Twilio: payload = URL + sorted form params
   * Nota: Twilio usa form-urlencoded, non JSON
   */
  computeSignature(rawBody: Buffer, secret: string): string {
    // Per Twilio serve l'URL completo + parametri ordinati
    // Questo è un caso speciale che richiede la URL della request
    return this.createHmac(rawBody.toString(), secret);
  }
}
```

### 6.9 Provider Index

```typescript
// src/providers/index.ts

import type { WebhookProvider, CustomProviderConfig } from '../types.js';
import { BaseProvider } from './base.js';
import { StripeProvider } from './stripe.js';
import { GitHubProvider } from './github.js';
import { SlackProvider } from './slack.js';
import { ShopifyProvider } from './shopify.js';
import { TwilioProvider } from './twilio.js';
import { UnknownProviderError } from '../errors.js';

const providers: Record<string, new () => BaseProvider> = {
  stripe: StripeProvider,
  github: GitHubProvider,
  slack: SlackProvider,
  shopify: ShopifyProvider,
  twilio: TwilioProvider
};

export function getProvider(
  name: WebhookProvider,
  customConfig?: CustomProviderConfig
): BaseProvider {
  if (name === 'custom' && customConfig) {
    return createCustomProvider(customConfig);
  }

  const ProviderClass = providers[name];
  if (!ProviderClass) {
    throw new UnknownProviderError(name);
  }

  return new ProviderClass();
}

function createCustomProvider(config: CustomProviderConfig): BaseProvider {
  // Implementazione provider custom
  return new CustomProvider(config);
}

class CustomProvider extends BaseProvider {
  private customConfig: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    super({
      name: config.name,
      signatureHeader: config.signatureHeader,
      timestampHeader: config.timestampHeader,
      algorithm: config.algorithm,
      signatureEncoding: config.signatureEncoding || 'hex'
    });
    this.customConfig = config;
  }

  extractSignature(headerValue: string): string {
    if (this.customConfig.extractSignature) {
      return this.customConfig.extractSignature(headerValue);
    }
    return headerValue;
  }

  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (this.customConfig.buildPayload) {
      const payload = this.customConfig.buildPayload(
        rawBody,
        timestamp ? String(Math.floor(timestamp.getTime() / 1000)) : undefined
      );
      return this.createHmac(payload, secret);
    }
    return this.createHmac(rawBody.toString(), secret);
  }
}

export { BaseProvider } from './base.js';
export { StripeProvider } from './stripe.js';
export { GitHubProvider } from './github.js';
export { SlackProvider } from './slack.js';
export { ShopifyProvider } from './shopify.js';
export { TwilioProvider } from './twilio.js';
```

### 6.10 Replay Protection

```typescript
// src/replay-protection.ts

import type { ReplayProtectionConfig, ReplayStorage } from './types.js';

/**
 * In-memory storage per replay protection
 */
class InMemoryReplayStorage implements ReplayStorage {
  private nonces = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private ttl: number = 300) {
    // Cleanup ogni minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async has(nonce: string): Promise<boolean> {
    return this.nonces.has(nonce);
  }

  async set(nonce: string, expiresAt: number): Promise<void> {
    this.nonces.set(nonce, expiresAt);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.nonces) {
      if (expiresAt < now) {
        this.nonces.delete(nonce);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.nonces.clear();
  }
}

export interface ReplayGuard {
  check(nonce: string): Promise<boolean>;
  record(nonce: string): Promise<void>;
}

export function createReplayProtection(
  config: ReplayProtectionConfig
): ReplayGuard {
  const storage = config.storage || new InMemoryReplayStorage(config.tolerance);
  const tolerance = (config.tolerance || 300) * 1000; // Convert to ms

  return {
    async check(nonce: string): Promise<boolean> {
      return storage.has(nonce);
    },

    async record(nonce: string): Promise<void> {
      const expiresAt = Date.now() + tolerance;
      await storage.set(nonce, expiresAt);
    }
  };
}
```

---

## 7. Esempi di Utilizzo

### 7.1 Setup Base

```typescript
import Fastify from 'fastify';
import webhookVerify from 'fastify-webhook-verify';

const fastify = Fastify({ logger: true });

await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    github: process.env.GITHUB_WEBHOOK_SECRET
  }
});

// Route webhook Stripe
fastify.post('/webhooks/stripe', {
  preHandler: fastify.webhookVerify({ provider: 'stripe' })
}, async (request) => {
  const event = request.body;
  const { eventType, timestamp } = request.webhook!;

  console.log(`Received Stripe event: ${eventType}`);

  // Gestisci l'evento
  switch (eventType) {
    case 'payment_intent.succeeded':
      // Handle payment success
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
  }

  return { received: true };
});

// Route webhook GitHub
fastify.post('/webhooks/github', {
  preHandler: fastify.webhookVerify({ provider: 'github' })
}, async (request) => {
  const payload = request.body;
  console.log('Received GitHub webhook:', payload);
  return { received: true };
});

await fastify.listen({ port: 3000 });
```

### 7.2 Multiple Provider con Secret Inline

```typescript
// Secret diversi per ambiente/route
fastify.post('/webhooks/stripe/live', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    secret: process.env.STRIPE_LIVE_SECRET!
  })
}, handler);

fastify.post('/webhooks/stripe/test', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    secret: process.env.STRIPE_TEST_SECRET!
  })
}, handler);
```

### 7.3 Custom Provider

```typescript
await fastify.register(webhookVerify);

// Provider custom per servizio interno
fastify.post('/webhooks/internal', {
  preHandler: fastify.webhookVerify({
    provider: 'custom',
    secret: process.env.INTERNAL_WEBHOOK_SECRET!,
    customConfig: {
      name: 'internal-service',
      signatureHeader: 'X-Internal-Signature',
      timestampHeader: 'X-Internal-Timestamp',
      algorithm: 'sha256',
      extractSignature: (header) => header,
      buildPayload: (body, ts) => `${ts}.${body.toString()}`
    }
  })
}, handler);
```

### 7.4 Con Error Handler Custom

```typescript
await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET
  },
  errorHandler: (error, request, reply) => {
    request.log.error({ err: error }, 'Webhook verification failed');

    // Risposta RFC 9457
    reply.status(error.statusCode).send({
      type: `https://api.example.com/errors/${error.code.toLowerCase()}`,
      title: error.message,
      status: error.statusCode,
      detail: error.provider ? `Provider: ${error.provider}` : undefined
    });
  },
  logAttempts: true
});
```

### 7.5 Con Replay Protection Custom (Redis)

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const redisStorage: ReplayStorage = {
  async has(nonce: string): Promise<boolean> {
    const exists = await redis.exists(`webhook:nonce:${nonce}`);
    return exists === 1;
  },

  async set(nonce: string, expiresAt: number): Promise<void> {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    await redis.setEx(`webhook:nonce:${nonce}`, ttl, '1');
  }
};

await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET
  },
  replayProtection: {
    enabled: true,
    tolerance: 300,
    storage: redisStorage
  }
});
```

### 7.6 Disabilita Replay Protection per Route Specifica

```typescript
// Route che permette duplicati (es. idempotent)
fastify.post('/webhooks/stripe/idempotent', {
  preHandler: fastify.webhookVerify({
    provider: 'stripe',
    replayProtection: { enabled: false }
  })
}, handler);
```

### 7.7 Hook per Audit Log

```typescript
await fastify.register(webhookVerify, {
  providers: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET
  },
  onVerify: async (result, request) => {
    await auditLog.record({
      timestamp: new Date(),
      provider: result.provider,
      eventType: result.eventType,
      success: result.valid,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });
  }
});
```

---

## 8. Test Cases

### 8.1 Test Plugin Base

```typescript
// test/plugin.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import webhookVerify from '../src/index.js';
import { createHmac } from 'crypto';

const STRIPE_SECRET = 'whsec_test_secret';

function createStripeSignature(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('should verify valid Stripe webhook', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { stripe: STRIPE_SECRET }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'stripe' })
  }, async (request) => {
    return { verified: request.webhook?.verified };
  });

  const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

  const response = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature
    },
    payload
  });

  t.equal(response.statusCode, 200);
  t.same(response.json(), { verified: true });
});

test('should reject invalid signature', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { stripe: STRIPE_SECRET }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'stripe' })
  }, async () => ({ success: true }));

  const payload = JSON.stringify({ type: 'test' });
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': `t=${timestamp},v1=invalid_signature`
    },
    payload
  });

  t.equal(response.statusCode, 401);
});

test('should reject missing signature', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { stripe: STRIPE_SECRET }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'stripe' })
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: { 'content-type': 'application/json' },
    payload: { type: 'test' }
  });

  t.equal(response.statusCode, 401);
});

test('should reject expired timestamp', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { stripe: STRIPE_SECRET },
    replayProtection: { enabled: true, tolerance: 300 }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'stripe' })
  }, async () => ({ success: true }));

  const payload = JSON.stringify({ type: 'test' });
  // Timestamp 10 minuti fa
  const timestamp = Math.floor(Date.now() / 1000) - 600;
  const signature = createStripeSignature(payload, STRIPE_SECRET, timestamp);

  const response = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature
    },
    payload
  });

  t.equal(response.statusCode, 401);
});
```

### 8.2 Test GitHub Provider

```typescript
// test/providers/github.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import webhookVerify from '../../src/index.js';
import { createHmac } from 'crypto';

const GITHUB_SECRET = 'github_test_secret';

function createGitHubSignature(payload: string, secret: string): string {
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
}

test('should verify valid GitHub webhook', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { github: GITHUB_SECRET }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'github' })
  }, async (request) => {
    return { verified: request.webhook?.verified };
  });

  const payload = JSON.stringify({ action: 'opened', number: 1 });
  const signature = createGitHubSignature(payload, GITHUB_SECRET);

  const response = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': signature,
      'x-github-event': 'pull_request'
    },
    payload
  });

  t.equal(response.statusCode, 200);
  t.same(response.json(), { verified: true });
});
```

### 8.3 Test Replay Protection

```typescript
// test/replay.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import webhookVerify from '../src/index.js';
import { createHmac } from 'crypto';

const SECRET = 'whsec_test';

function createSignature(payload: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', SECRET)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('should reject duplicate webhooks', async (t) => {
  const fastify = Fastify();

  await fastify.register(webhookVerify, {
    providers: { stripe: SECRET },
    replayProtection: { enabled: true, tolerance: 300 }
  });

  fastify.post('/webhook', {
    preHandler: fastify.webhookVerify({ provider: 'stripe' })
  }, async () => ({ received: true }));

  const payload = JSON.stringify({ type: 'test', id: 'evt_123' });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createSignature(payload, timestamp);

  // Prima richiesta: successo
  const response1 = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature
    },
    payload
  });

  t.equal(response1.statusCode, 200);

  // Seconda richiesta con stessa firma: replay attack
  const response2 = await fastify.inject({
    method: 'POST',
    url: '/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature
    },
    payload
  });

  t.equal(response2.statusCode, 401);
});
```

---

## 9. Configurazione Build

### 9.1 package.json

```json
{
  "name": "fastify-webhook-verify",
  "version": "1.0.0",
  "description": "Multi-provider webhook signature verification for Fastify with replay protection and TypeScript support",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./providers": {
      "import": "./dist/providers/index.js",
      "types": "./dist/providers/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "tap test/**/*.test.ts",
    "test:coverage": "tap test/**/*.test.ts --coverage-report=lcov",
    "lint": "eslint src test",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "fastify",
    "fastify-plugin",
    "webhook",
    "signature",
    "verification",
    "stripe",
    "github",
    "twilio",
    "slack",
    "shopify",
    "security",
    "hmac"
  ],
  "author": "fracabu",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/fracabu/fastify-webhook-verify.git"
  },
  "bugs": {
    "url": "https://github.com/fracabu/fastify-webhook-verify/issues"
  },
  "homepage": "https://github.com/fracabu/fastify-webhook-verify#readme",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "fastify-plugin": "^5.0.0"
  },
  "peerDependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "fastify": "^5.0.0",
    "tap": "^21.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0"
  }
}
```

### 9.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 9.3 tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/providers/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20'
});
```

### 9.4 GitHub Actions CI

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build

      - name: Publish to npm
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        continue-on-error: true
```

---

## 10. Checklist Pre-Pubblicazione

- [ ] Implementazione core completa
- [ ] Tutti i 5 provider prioritari implementati
- [ ] TypeScript types esportati e testati
- [ ] Test coverage > 90%
- [ ] Replay protection funzionante
- [ ] README.md con esempi per ogni provider
- [ ] CHANGELOG.md iniziale
- [ ] LICENSE MIT
- [ ] CI/CD GitHub Actions funzionante
- [ ] npm publish test con --dry-run
- [ ] Validazione con publint
- [ ] Validazione con arethetypeswrong
- [ ] Security audit (timing attacks, raw body handling)

---

## 11. Roadmap Post-v1.0

### v1.1 - Additional Providers
- Paddle
- Clerk
- Resend
- Linear

### v1.2 - Advanced Features
- IP whitelist per provider
- Rate limiting per endpoint
- Metrics/observability hooks

### v1.3 - Integrations
- Redis storage adapter ufficiale
- OpenTelemetry integration
- Fastify @fastify ecosystem candidatura

---

*Ultimo aggiornamento: 11 Dicembre 2025*
