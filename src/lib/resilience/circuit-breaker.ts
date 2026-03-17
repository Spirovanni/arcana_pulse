/**
 * Circuit breaker pattern for external service calls.
 *
 * State machine: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * - CLOSED: normal operation, track consecutive failures
 * - OPEN: too many failures — reject immediately with CircuitOpenError
 * - HALF_OPEN: after cooldown, allow one test request through
 *
 * State is per-serverless-instance (no Redis needed). Each instance
 * protects itself from hammering a degraded service.
 */

import { CircuitOpenError } from "./errors";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenAttempts?: number;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenAttempts: number;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 60_000;
    this.halfOpenAttempts = options?.halfOpenAttempts ?? 1;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Try transitioning OPEN → HALF_OPEN after cooldown
    if (this.state === "OPEN" && this.cooldownElapsed()) {
      this.state = "HALF_OPEN";
      this.successCount = 0;
    }

    if (this.state === "OPEN") {
      throw new CircuitOpenError("Circuit breaker is OPEN — service unavailable");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.halfOpenAttempts) {
        this.reset();
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
    } else if (
      this.state === "CLOSED" &&
      this.failureCount >= this.failureThreshold
    ) {
      this.state = "OPEN";
    }
  }

  private cooldownElapsed(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }
}

// ─── Per-service instances ───────────────────────────────────────────

export const appwriteCircuit = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenAttempts: 1,
});

export const plaidCircuit = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  halfOpenAttempts: 1,
});

export const dwollaCircuit = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  halfOpenAttempts: 1,
});
