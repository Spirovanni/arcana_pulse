/**
 * Error classification for resilience layer.
 *
 * Determines which errors are transient (retryable) vs permanent (fail fast).
 */

export class CircuitOpenError extends Error {
  name = "CircuitOpenError" as const;
}

export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Circuit breaker errors — fail fast, don't retry
  if (error instanceof CircuitOpenError) return false;

  const err = error as Record<string, unknown>;
  const code =
    (err.code as number) ?? (err.status as number) ?? (err.statusCode as number);
  const message = err.message ? String(err.message) : String(error);

  // HTTP 5xx — server error, retryable
  if (typeof code === "number" && code >= 500 && code < 600) return true;

  // HTTP 429 — rate limited, retryable after backoff
  if (code === 429) return true;

  // HTTP 4xx (except 429) — client error, NOT retryable
  if (typeof code === "number" && code >= 400 && code < 500) return false;

  // Node.js network errors
  const networkCodes = [
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ENETUNREACH",
    "EAI_AGAIN",
  ];
  if (networkCodes.some((c) => message.includes(c))) return true;

  // Common network error messages
  const networkMessages = [
    "network timeout",
    "socket hang up",
    "connection timeout",
    "request timeout",
    "service unavailable",
    "server error",
  ];
  if (networkMessages.some((m) => message.toLowerCase().includes(m))) return true;

  // Default: don't retry unknown errors (conservative)
  return false;
}
