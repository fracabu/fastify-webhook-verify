import { BaseProvider } from './base.js';

/**
 * Shopify webhook provider
 * Signature: base64-encoded HMAC-SHA256
 */
export class ShopifyProvider extends BaseProvider {
  constructor() {
    super({
      name: 'shopify',
      signatureHeader: 'x-shopify-hmac-sha256',
      timestampHeader: undefined,
      algorithm: 'sha256',
      signatureEncoding: 'base64',
    });
  }

  /**
   * Extract signature from X-Shopify-Hmac-SHA256 header
   * Format: raw base64 signature
   */
  extractSignature(headerValue: string): string {
    return headerValue;
  }

  /**
   * Compute Shopify signature
   * Payload: raw body
   */
  computeSignature(rawBody: Buffer, secret: string, _timestamp?: Date): string {
    return this.createHmac(rawBody.toString(), secret);
  }

  /**
   * Shopify topic is in header X-Shopify-Topic, not body
   */
  override extractEventType(_body: Record<string, unknown>): string | undefined {
    return undefined;
  }
}
