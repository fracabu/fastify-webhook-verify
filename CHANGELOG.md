# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-11

### Added

- Initial release
- Multi-provider webhook verification support:
  - Stripe (HMAC-SHA256)
  - GitHub (HMAC-SHA256)
  - Twilio (HMAC-SHA1)
  - Slack (HMAC-SHA256 with timestamp)
  - Shopify (HMAC-SHA256 base64)
- Custom provider support with configurable:
  - Signature header
  - Timestamp header
  - HMAC algorithm (sha1, sha256, sha512)
  - Signature encoding (hex, base64)
  - Custom signature extraction
  - Custom payload building
- Replay attack protection:
  - Configurable timestamp tolerance (default: 5 minutes)
  - In-memory nonce storage with auto-cleanup
  - Custom storage interface (e.g., Redis)
  - Per-route override capability
- Fastify-native integration:
  - PreHandler pattern for clean route integration
  - Automatic raw body preservation
  - Request decoration with webhook data
- TypeScript-first design:
  - Full type declarations
  - Fastify module augmentation
  - Strict type checking
- Timing-safe signature comparison
- Custom error handler support
- Post-verification hooks
- Comprehensive test suite
