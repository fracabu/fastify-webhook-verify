import fp from 'fastify-plugin';
import { fastifyWebhookVerifyPlugin } from './plugin.js';
import type { FastifyWebhookVerifyOptions } from './types.js';

export type {
  FastifyWebhookVerifyOptions,
  WebhookProvider,
  WebhookRouteOptions,
  WebhookData,
  WebhookVerificationResult,
  WebhookVerifyHook,
  WebhookErrorHandler,
  ReplayProtectionConfig,
  ReplayStorage,
  CustomProviderConfig,
} from './types.js';

export {
  WebhookError,
  MissingSignatureError,
  InvalidSignatureError,
  TimestampExpiredError,
  ReplayAttackError,
  MissingRawBodyError,
  UnknownProviderError,
  MissingSecretError,
} from './errors.js';

export {
  BaseProvider,
  StripeProvider,
  GitHubProvider,
  SlackProvider,
  ShopifyProvider,
  TwilioProvider,
  CustomProvider,
  getProvider,
} from './providers/index.js';

export { createReplayProtection, type ReplayGuard } from './replay-protection.js';

const fastifyWebhookVerify = fp<FastifyWebhookVerifyOptions>(fastifyWebhookVerifyPlugin, {
  fastify: '5.x',
  name: 'fastify-webhook-verify',
});

export default fastifyWebhookVerify;
