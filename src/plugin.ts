import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  FastifyWebhookVerifyOptions,
  WebhookRouteOptions,
  WebhookData,
  ReplayProtectionConfig,
} from './types.js';
import { getProvider } from './providers/index.js';
import { createReplayProtection, type ReplayGuard } from './replay-protection.js';
import {
  MissingSignatureError,
  InvalidSignatureError,
  MissingRawBodyError,
  ReplayAttackError,
  TimestampExpiredError,
  MissingSecretError,
} from './errors.js';

const DEFAULT_REPLAY_PROTECTION: ReplayProtectionConfig = {
  enabled: true,
  tolerance: 300, // 5 minutes
};

/**
 * Main plugin implementation
 */
export async function fastifyWebhookVerifyPlugin(
  fastify: FastifyInstance,
  options: FastifyWebhookVerifyOptions
): Promise<void> {
  const {
    providers = {},
    replayProtection = DEFAULT_REPLAY_PROTECTION,
    errorHandler,
    onVerify,
    logAttempts = false,
  } = options;

  // Setup replay protection
  let replayGuard: ReplayGuard | null = null;
  if (replayProtection.enabled) {
    replayGuard = createReplayProtection(replayProtection);
  }

  // Cleanup on close
  fastify.addHook('onClose', () => {
    if (replayGuard?.destroy) {
      replayGuard.destroy();
    }
  });

  // Decorate request with webhook data
  fastify.decorateRequest('webhook', undefined);
  fastify.decorateRequest('rawBody', undefined);

  // Raw body parser - preserve original body for signature verification
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body: Buffer, done) => {
      (req as FastifyRequest).rawBody = body;
      try {
        const json: unknown = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  /**
   * Create verification handler for a route
   */
  const createVerifyHandler = (
    routeOptions: WebhookRouteOptions
  ): ((request: FastifyRequest, reply: FastifyReply) => Promise<void>) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { provider: providerName, customConfig } = routeOptions;

      // Get secret from route options or global providers
      let secret = routeOptions.secret;
      if (!secret && providerName !== 'custom') {
        secret = providers[providerName];
      }

      if (!secret) {
        const error = new MissingSecretError(providerName);
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 1. Verify raw body exists
      const rawBody = request.rawBody;
      if (!rawBody) {
        const error = new MissingRawBodyError();
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 2. Get provider
      const provider = getProvider(providerName, customConfig);

      // 3. Extract signature header
      const signatureHeader = request.headers[provider.signatureHeader];
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        const error = new MissingSignatureError(providerName);
        if (logAttempts) {
          request.log.warn({ provider: providerName }, 'Missing webhook signature');
        }
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 4. Extract timestamp (if supported)
      let timestamp: Date | undefined;
      if (provider.timestampHeader) {
        const tsHeader = request.headers[provider.timestampHeader];
        if (tsHeader && typeof tsHeader === 'string') {
          timestamp = provider.parseTimestamp(tsHeader);
        }
      } else if (providerName === 'stripe') {
        // Stripe has timestamp in signature header
        timestamp = provider.parseTimestamp(signatureHeader);
      }

      // 5. Verify timestamp (replay protection)
      const rpConfig = { ...replayProtection, ...routeOptions.replayProtection };
      if (rpConfig.enabled && timestamp) {
        const now = Date.now();
        const webhookTime = timestamp.getTime();
        const tolerance = (rpConfig.tolerance ?? 300) * 1000;

        if (Math.abs(now - webhookTime) > tolerance) {
          const error = new TimestampExpiredError(
            providerName,
            timestamp,
            rpConfig.tolerance ?? 300
          );
          if (logAttempts) {
            request.log.warn({ provider: providerName, timestamp }, 'Webhook timestamp expired');
          }
          if (errorHandler) {
            await errorHandler(error, request, reply);
            return;
          }
          throw error;
        }
      }

      // 6. Verify signature
      let signature: string;
      try {
        signature = provider.extractSignature(signatureHeader);
      } catch {
        const error = new InvalidSignatureError(providerName);
        if (logAttempts) {
          request.log.warn({ provider: providerName }, 'Failed to extract signature');
        }
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      const expectedSignature = provider.computeSignature(rawBody, secret, timestamp);
      const isValid = provider.verifySignature(signature, expectedSignature);

      if (!isValid) {
        const error = new InvalidSignatureError(providerName);
        if (logAttempts) {
          request.log.warn({ provider: providerName }, 'Invalid webhook signature');
        }
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 7. Check replay (nonce check)
      if (replayGuard && rpConfig.enabled && timestamp) {
        const nonce = `${providerName}:${signature}:${timestamp.getTime()}`;
        const isDuplicate = await replayGuard.check(nonce);

        if (isDuplicate) {
          const error = new ReplayAttackError(providerName);
          if (logAttempts) {
            request.log.warn({ provider: providerName }, 'Duplicate webhook detected');
          }
          if (errorHandler) {
            await errorHandler(error, request, reply);
            return;
          }
          throw error;
        }

        await replayGuard.record(nonce);
      }

      // 8. Populate request with webhook data
      const eventType = provider.extractEventType(request.body as Record<string, unknown>);

      const webhookData: WebhookData = {
        verified: true,
        provider: providerName,
        timestamp,
        rawBody,
        eventType,
      };

      request.webhook = webhookData;

      // 9. Post-verification hook
      if (onVerify) {
        await onVerify(
          {
            valid: true,
            provider: providerName,
            timestamp,
            eventType,
          },
          request
        );
      }

      if (logAttempts) {
        request.log.info({ provider: providerName, eventType }, 'Webhook verified successfully');
      }
    };
  };

  // Decorate fastify instance with webhookVerify function
  fastify.decorate('webhookVerify', (routeOptions: WebhookRouteOptions) => {
    return createVerifyHandler(routeOptions);
  });
}
