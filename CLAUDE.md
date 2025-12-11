# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

fastify-webhook-verify is a Fastify plugin for multi-provider webhook signature verification with replay attack protection. It supports Stripe, GitHub, Twilio, Slack, and Shopify webhooks out of the box, plus custom providers.

## Build & Development Commands

```bash
npm run build          # Build with tsup (ESM + CJS output)
npm run test           # Run tests with vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors
npm run typecheck      # TypeScript type checking
npm run format         # Format with Prettier
```

To run a single test file:
```bash
npx vitest run test/providers/stripe.test.ts
```

## Architecture

### Core Components

- **src/index.ts** - Entry point, exports plugin wrapped with fastify-plugin
- **src/plugin.ts** - Main plugin implementation with preHandler pattern
- **src/types.ts** - TypeScript types and Fastify augmentation (declares `request.webhook` and `request.rawBody`)
- **src/providers/** - Provider implementations inheriting from BaseProvider
- **src/replay-protection.ts** - In-memory nonce storage with cleanup interval
- **src/errors.ts** - Custom error classes (MissingSignatureError, InvalidSignatureError, etc.)

### Provider Pattern

Each provider extends `BaseProvider` and implements:
- `extractSignature(headerValue: string): string` - Parse signature from header
- `computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string` - Calculate expected signature
- `parseTimestamp(headerValue: string): Date` - Parse timestamp (optional override)
- `extractEventType(body: object): string | undefined` - Extract event type from body

Provider-specific signature formats:
- **Stripe**: `t=timestamp,v1=signature` in single header
- **GitHub**: `sha256=signature` prefix
- **Slack**: `v0=signature` prefix, separate timestamp header
- **Shopify**: Raw base64 signature
- **Twilio**: Raw base64 signature (SHA1)

### Plugin Flow

1. Raw body parser captures `request.rawBody` as Buffer
2. `webhookVerify` preHandler extracts signature/timestamp headers
3. Provider computes expected signature from payload
4. Timing-safe comparison validates signature
5. Replay protection checks nonce uniqueness
6. `request.webhook` populated with verification result

### Key Design Decisions

- Uses `addContentTypeParser` to preserve raw body for signature verification
- Timing-safe comparison via `crypto.timingSafeEqual` prevents timing attacks
- Replay protection uses signature+timestamp as nonce key
- Supports custom storage backends (Redis) via `ReplayStorage` interface
- Fastify 5.x only (`peerDependencies`)
- Node.js 20+ required
