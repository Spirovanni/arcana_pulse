/**
 * Exponential backoff retry utility.
 *
 * Wraps an async function and retries on transient errors with
 * increasing delay + jitter to avoid thundering herd.
 */

import { isRetryableError } from "./errors";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(
  attempt: number,
  base: number,
  max: number,
): number {
  const exponential = base * Math.pow(2, attempt);
  const jitter = Math.random() * base;
  return Math.min(exponential + jitter, max);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 200;
  const maxDelayMs = options?.maxDelayMs ?? 5000;
  const onRetry = options?.onRetry;
  const shouldRetry = options?.shouldRetry;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Non-retryable → fail immediately
      const retryable = shouldRetry ? shouldRetry(error) : isRetryableError(error);
      if (!retryable) throw lastError;

      // Last attempt → fail
      if (attempt === maxRetries) throw lastError;

      onRetry?.(attempt + 1, lastError);
      await sleep(backoff(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError!;
}
