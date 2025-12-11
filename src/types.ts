import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

/**
 * Supported webhook providers
 */
export type WebhookProvider = 'stripe' | 'github' | 'twilio' | 'slack' | 'shopify' | 'custom';

/**
 * Custom provider configuration
 */
export interface CustomProviderConfig {
  /** Provider name for logging */
  name: string;
  /** Header containing the signature */
  signatureHeader: string;
  /** Header containing the timestamp (optional) */
  timestampHeader?: string;
  /** HMAC algorithm */
  algorithm: 'sha1' | 'sha256' | 'sha512';
  /** Function to extract signature from header value */
  extractSignature?: (headerValue: string) => string;
  /** Function to build the payload to sign */
  buildPayload?: (rawBody: Buffer, timestamp?: string) => string;
  /** Signature encoding */
  signatureEncoding?: 'hex' | 'base64';
}

/**
 * Replay protection configuration
 */
export interface ReplayProtectionConfig {
  /** Enable replay protection */
  enabled: boolean;
  /** Timestamp tolerance in seconds (default: 300 = 5 minutes) */
  tolerance?: number;
  /** Storage for nonces (default: in-memory) */
  storage?: ReplayStorage;
}

/**
 * Interface for replay protection storage
 */
export interface ReplayStorage {
  /** Check if a nonce already exists */
  has(nonce: string): Promise<boolean>;
  /** Save a nonce */
  set(nonce: string, expiresAt: number): Promise<void>;
  /** Remove expired nonces */
  cleanup?(): Promise<void>;
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  /** Whether verification succeeded */
  valid: boolean;
  /** Provider that verified */
  provider: WebhookProvider;
  /** Webhook timestamp (if available) */
  timestamp: Date | undefined;
  /** Failure reason */
  error?: string;
  /** Event type (if available from provider) */
  eventType: string | undefined;
}

/**
 * Hook called after verification
 */
export type WebhookVerifyHook = (
  result: WebhookVerificationResult,
  request: FastifyRequest
) => void | Promise<void>;

/**
 * Custom error handler
 */
export type WebhookErrorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) => void | Promise<void>;

/**
 * Options for single route
 */
export interface WebhookRouteOptions {
  /** Provider for this route */
  provider: WebhookProvider;
  /** Secret for this provider */
  secret?: string;
  /** Custom provider configuration */
  customConfig?: CustomProviderConfig;
  /** Override replay protection */
  replayProtection?: Partial<ReplayProtectionConfig>;
}

/**
 * Plugin options
 */
export interface FastifyWebhookVerifyOptions {
  /**
   * Provider configuration (secret per provider)
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
   * Global replay protection configuration
   * @default { enabled: true, tolerance: 300 }
   */
  replayProtection?: ReplayProtectionConfig;

  /**
   * Custom error handler
   */
  errorHandler?: WebhookErrorHandler;

  /**
   * Post-verification hook
   */
  onVerify?: WebhookVerifyHook;

  /**
   * If true, log verification attempts
   * @default false
   */
  logAttempts?: boolean;
}

/**
 * Webhook data available in request
 */
export interface WebhookData {
  /** Whether webhook was verified */
  verified: boolean;
  /** Provider used */
  provider: WebhookProvider;
  /** Original timestamp */
  timestamp: Date | undefined;
  /** Raw body of the request */
  rawBody: Buffer;
  /** Event type (if available) */
  eventType: string | undefined;
}

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * PreHandler to verify webhooks
     */
    webhookVerify: (options: WebhookRouteOptions) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    /**
     * Webhook data (available after verification)
     */
    webhook?: WebhookData;

    /**
     * Raw body of the request
     */
    rawBody?: Buffer;
  }
}
