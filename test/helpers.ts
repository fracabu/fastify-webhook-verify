import { createHmac } from 'crypto';

/**
 * Create a Stripe webhook signature
 */
export function createStripeSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Create a GitHub webhook signature
 */
export function createGitHubSignature(payload: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${signature}`;
}

/**
 * Create a Slack webhook signature
 */
export function createSlackSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const baseString = `v0:${timestamp}:${payload}`;
  const signature = createHmac('sha256', secret).update(baseString).digest('hex');
  return `v0=${signature}`;
}

/**
 * Create a Shopify webhook signature
 */
export function createShopifySignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64');
}

/**
 * Create a Twilio webhook signature
 */
export function createTwilioSignature(payload: string, secret: string): string {
  return createHmac('sha1', secret).update(payload).digest('base64');
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get expired timestamp (10 minutes ago)
 */
export function getExpiredTimestamp(): number {
  return Math.floor(Date.now() / 1000) - 600;
}
