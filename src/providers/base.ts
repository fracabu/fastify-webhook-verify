import { createHmac } from 'crypto';
import { timingSafeCompare } from '../utils.js';

export interface WebhookProviderConfig {
  name: string;
  signatureHeader: string;
  timestampHeader: string | undefined;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  signatureEncoding: 'hex' | 'base64';
}

/**
 * Base class for webhook providers
 */
export abstract class BaseProvider {
  protected readonly config: WebhookProviderConfig;

  constructor(config: WebhookProviderConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get signatureHeader(): string {
    return this.config.signatureHeader;
  }

  get timestampHeader(): string | undefined {
    return this.config.timestampHeader;
  }

  get algorithm(): string {
    return this.config.algorithm;
  }

  get signatureEncoding(): 'hex' | 'base64' {
    return this.config.signatureEncoding;
  }

  /**
   * Extract signature from header value
   */
  abstract extractSignature(headerValue: string): string;

  /**
   * Parse timestamp from header value
   */
  parseTimestamp(headerValue: string): Date {
    const ts = parseInt(headerValue, 10);
    return new Date(ts * 1000);
  }

  /**
   * Compute expected signature
   */
  abstract computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string;

  /**
   * Verify signature in timing-safe manner
   */
  verifySignature(provided: string, expected: string): boolean {
    return timingSafeCompare(provided, expected, this.config.signatureEncoding);
  }

  /**
   * Extract event type from body (optional)
   */
  extractEventType(_body: Record<string, unknown>): string | undefined {
    return undefined;
  }

  /**
   * Helper to create HMAC
   */
  protected createHmac(payload: string, secret: string): string {
    return createHmac(this.config.algorithm, secret)
      .update(payload)
      .digest(this.config.signatureEncoding);
  }
}
