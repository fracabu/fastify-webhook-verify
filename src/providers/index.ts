import type { WebhookProvider, CustomProviderConfig } from '../types.js';
import { UnknownProviderError } from '../errors.js';
import { BaseProvider } from './base.js';
import { StripeProvider } from './stripe.js';
import { GitHubProvider } from './github.js';
import { SlackProvider } from './slack.js';
import { ShopifyProvider } from './shopify.js';
import { TwilioProvider } from './twilio.js';
import { CustomProvider } from './custom.js';

type ProviderConstructor = new () => BaseProvider;

const providers: Record<string, ProviderConstructor> = {
  stripe: StripeProvider,
  github: GitHubProvider,
  slack: SlackProvider,
  shopify: ShopifyProvider,
  twilio: TwilioProvider,
};

/**
 * Get a provider instance by name
 */
export function getProvider(
  name: WebhookProvider,
  customConfig?: CustomProviderConfig
): BaseProvider {
  if (name === 'custom') {
    if (!customConfig) {
      throw new Error('Custom provider requires customConfig');
    }
    return new CustomProvider(customConfig);
  }

  const ProviderClass = providers[name];
  if (!ProviderClass) {
    throw new UnknownProviderError(name);
  }

  return new ProviderClass();
}

export { BaseProvider } from './base.js';
export { StripeProvider } from './stripe.js';
export { GitHubProvider } from './github.js';
export { SlackProvider } from './slack.js';
export { ShopifyProvider } from './shopify.js';
export { TwilioProvider } from './twilio.js';
export { CustomProvider } from './custom.js';
