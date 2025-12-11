import { BaseProvider } from './base.js';

/**
 * Slack webhook provider
 * Signature format: v0=signature
 * Separate timestamp header
 */
export class SlackProvider extends BaseProvider {
  constructor() {
    super({
      name: 'slack',
      signatureHeader: 'x-slack-signature',
      timestampHeader: 'x-slack-request-timestamp',
      algorithm: 'sha256',
      signatureEncoding: 'hex',
    });
  }

  /**
   * Extract signature from X-Slack-Signature header
   * Format: v0=signature
   */
  extractSignature(headerValue: string): string {
    const prefix = 'v0=';
    if (headerValue.startsWith(prefix)) {
      return headerValue.slice(prefix.length);
    }
    throw new Error('Invalid Slack signature format');
  }

  /**
   * Compute Slack signature
   * Payload: v0:timestamp:body
   */
  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (!timestamp) {
      throw new Error('Timestamp is required for Slack webhook verification');
    }
    const ts = Math.floor(timestamp.getTime() / 1000);
    const payload = `v0:${ts}:${rawBody.toString()}`;
    return this.createHmac(payload, secret);
  }

  /**
   * Extract event type from Slack webhook body
   */
  override extractEventType(body: Record<string, unknown>): string | undefined {
    return typeof body.type === 'string' ? body.type : undefined;
  }
}
