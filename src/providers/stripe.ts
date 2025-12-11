import { BaseProvider } from './base.js';

/**
 * Stripe webhook provider
 * Signature format: t=timestamp,v1=signature
 */
export class StripeProvider extends BaseProvider {
  constructor() {
    super({
      name: 'stripe',
      signatureHeader: 'stripe-signature',
      timestampHeader: undefined,
      algorithm: 'sha256',
      signatureEncoding: 'hex',
    });
  }

  /**
   * Extract v1 signature from Stripe-Signature header
   * Format: t=timestamp,v1=signature
   */
  extractSignature(headerValue: string): string {
    const parts = headerValue.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'v1' && value) {
        return value;
      }
    }
    throw new Error('No v1 signature found in Stripe-Signature header');
  }

  /**
   * Parse timestamp from Stripe-Signature header
   */
  override parseTimestamp(headerValue: string): Date {
    const parts = headerValue.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't' && value) {
        return new Date(parseInt(value, 10) * 1000);
      }
    }
    throw new Error('No timestamp found in Stripe-Signature header');
  }

  /**
   * Compute Stripe signature
   * Payload: timestamp.body
   */
  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (!timestamp) {
      throw new Error('Timestamp is required for Stripe webhook verification');
    }
    const ts = Math.floor(timestamp.getTime() / 1000);
    const payload = `${ts}.${rawBody.toString()}`;
    return this.createHmac(payload, secret);
  }

  /**
   * Extract event type from Stripe webhook body
   */
  override extractEventType(body: Record<string, unknown>): string | undefined {
    return typeof body.type === 'string' ? body.type : undefined;
  }
}
