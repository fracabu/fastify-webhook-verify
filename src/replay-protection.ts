import type { ReplayProtectionConfig, ReplayStorage } from './types.js';

/**
 * In-memory storage for replay protection
 */
class InMemoryReplayStorage implements ReplayStorage {
  private readonly nonces = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(_ttl = 300) {
    // Cleanup every minute
    this.cleanupInterval = setInterval(() => {
      void this.cleanup();
    }, 60000);
    // Prevent interval from blocking Node.js exit
    this.cleanupInterval.unref();
  }

  has(nonce: string): Promise<boolean> {
    return Promise.resolve(this.nonces.has(nonce));
  }

  set(nonce: string, expiresAt: number): Promise<void> {
    this.nonces.set(nonce, expiresAt);
    return Promise.resolve();
  }

  cleanup(): Promise<void> {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.nonces) {
      if (expiresAt < now) {
        this.nonces.delete(nonce);
      }
    }
    return Promise.resolve();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.nonces.clear();
  }
}

/**
 * Replay protection guard interface
 */
export interface ReplayGuard {
  /** Check if nonce was already seen */
  check(nonce: string): Promise<boolean>;
  /** Record a nonce */
  record(nonce: string): Promise<void>;
  /** Destroy the guard and cleanup resources */
  destroy?(): void;
}

/**
 * Create a replay protection guard
 */
export function createReplayProtection(config: ReplayProtectionConfig): ReplayGuard {
  const tolerance = config.tolerance ?? 300;
  const storage = config.storage ?? new InMemoryReplayStorage(tolerance);
  const toleranceMs = tolerance * 1000;

  return {
    async check(nonce: string): Promise<boolean> {
      return storage.has(nonce);
    },

    async record(nonce: string): Promise<void> {
      const expiresAt = Date.now() + toleranceMs;
      await storage.set(nonce, expiresAt);
    },

    destroy(): void {
      if ('destroy' in storage && typeof storage.destroy === 'function') {
        (storage as InMemoryReplayStorage).destroy();
      }
    },
  };
}
