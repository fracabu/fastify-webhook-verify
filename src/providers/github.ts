import { BaseProvider } from './base.js';

/**
 * GitHub webhook provider
 * Signature format: sha256=signature
 */
export class GitHubProvider extends BaseProvider {
  constructor() {
    super({
      name: 'github',
      signatureHeader: 'x-hub-signature-256',
      timestampHeader: undefined,
      algorithm: 'sha256',
      signatureEncoding: 'hex',
    });
  }

  /**
   * Extract signature from X-Hub-Signature-256 header
   * Format: sha256=signature
   */
  extractSignature(headerValue: string): string {
    const prefix = 'sha256=';
    if (headerValue.startsWith(prefix)) {
      return headerValue.slice(prefix.length);
    }
    throw new Error('Invalid GitHub signature format');
  }

  /**
   * Compute GitHub signature
   * Payload: raw body
   */
  computeSignature(rawBody: Buffer, secret: string, _timestamp?: Date): string {
    return this.createHmac(rawBody.toString(), secret);
  }

  /**
   * GitHub event type is in header X-GitHub-Event, not body
   */
  override extractEventType(_body: Record<string, unknown>): string | undefined {
    return undefined;
  }
}
