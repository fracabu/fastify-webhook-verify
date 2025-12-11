import { BaseProvider } from './base.js';
import type { CustomProviderConfig } from '../types.js';

/**
 * Custom webhook provider for user-defined providers
 */
export class CustomProvider extends BaseProvider {
  private readonly customConfig: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    super({
      name: config.name,
      signatureHeader: config.signatureHeader.toLowerCase(),
      timestampHeader: config.timestampHeader?.toLowerCase(),
      algorithm: config.algorithm,
      signatureEncoding: config.signatureEncoding ?? 'hex',
    });
    this.customConfig = config;
  }

  /**
   * Extract signature using custom extractor or return raw value
   */
  extractSignature(headerValue: string): string {
    if (this.customConfig.extractSignature) {
      return this.customConfig.extractSignature(headerValue);
    }
    return headerValue;
  }

  /**
   * Compute signature using custom payload builder or raw body
   */
  computeSignature(rawBody: Buffer, secret: string, timestamp?: Date): string {
    if (this.customConfig.buildPayload) {
      const ts = timestamp ? String(Math.floor(timestamp.getTime() / 1000)) : undefined;
      const payload = this.customConfig.buildPayload(rawBody, ts);
      return this.createHmac(payload, secret);
    }
    return this.createHmac(rawBody.toString(), secret);
  }
}
