/**
 * Base webhook error class
 */
export class WebhookError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly provider: string | undefined;

  constructor(code: string, message: string, statusCode = 401, provider?: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
    this.statusCode = statusCode;
    this.provider = provider;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Missing signature header error
 */
export class MissingSignatureError extends WebhookError {
  constructor(provider: string) {
    super('MISSING_SIGNATURE', `Missing webhook signature header for ${provider}`, 401, provider);
    this.name = 'MissingSignatureError';
  }
}

/**
 * Invalid signature error
 */
export class InvalidSignatureError extends WebhookError {
  constructor(provider: string) {
    super('INVALID_SIGNATURE', `Invalid webhook signature for ${provider}`, 401, provider);
    this.name = 'InvalidSignatureError';
  }
}

/**
 * Timestamp expired error
 */
export class TimestampExpiredError extends WebhookError {
  public readonly timestamp: Date;
  public readonly tolerance: number;

  constructor(provider: string, timestamp: Date, tolerance: number) {
    super('TIMESTAMP_EXPIRED', `Webhook timestamp expired for ${provider}`, 401, provider);
    this.name = 'TimestampExpiredError';
    this.timestamp = timestamp;
    this.tolerance = tolerance;
  }
}

/**
 * Replay attack detected error
 */
export class ReplayAttackError extends WebhookError {
  constructor(provider: string) {
    super('REPLAY_ATTACK', `Duplicate webhook detected for ${provider}`, 401, provider);
    this.name = 'ReplayAttackError';
  }
}

/**
 * Missing raw body error
 */
export class MissingRawBodyError extends WebhookError {
  constructor() {
    super(
      'MISSING_RAW_BODY',
      'Raw body is required for webhook verification. Ensure rawBody parser is enabled.',
      500
    );
    this.name = 'MissingRawBodyError';
  }
}

/**
 * Unknown provider error
 */
export class UnknownProviderError extends WebhookError {
  constructor(provider: string) {
    super('UNKNOWN_PROVIDER', `Unknown webhook provider: ${provider}`, 400, provider);
    this.name = 'UnknownProviderError';
  }
}

/**
 * Missing secret error
 */
export class MissingSecretError extends WebhookError {
  constructor(provider: string) {
    super('MISSING_SECRET', `Missing secret for provider: ${provider}`, 500, provider);
    this.name = 'MissingSecretError';
  }
}
