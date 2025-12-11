import { BaseProvider } from './base.js';

/**
 * Twilio webhook provider
 * Signature: base64-encoded HMAC-SHA1
 */
export class TwilioProvider extends BaseProvider {
  constructor() {
    super({
      name: 'twilio',
      signatureHeader: 'x-twilio-signature',
      timestampHeader: undefined,
      algorithm: 'sha1',
      signatureEncoding: 'base64',
    });
  }

  /**
   * Extract signature from X-Twilio-Signature header
   * Format: raw base64 signature
   */
  extractSignature(headerValue: string): string {
    return headerValue;
  }

  /**
   * Compute Twilio signature
   * Note: For full Twilio verification, URL + sorted params should be used.
   * This is a simplified version using raw body.
   */
  computeSignature(rawBody: Buffer, secret: string, _timestamp?: Date): string {
    return this.createHmac(rawBody.toString(), secret);
  }
}
