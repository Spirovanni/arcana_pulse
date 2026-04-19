/**
 * Sliding-window in-memory rate limiter for Next.js middleware (Edge runtime).
 *
 * Each key maps to an array of request timestamps. Requests older than the
 * window are pruned on every check, keeping memory bounded.
 */

const store = new Map<string, number[]>();

// Auto-prune stale keys every 5 minutes so the Map doesn't grow unbounded
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((timestamps, key) => {
      if (timestamps[timestamps.length - 1] < now - 5 * 60 * 1000) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * @param key      Unique key (e.g. "sign-in:1.2.3.4")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    store.set(key, timestamps);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0, remaining: limit - timestamps.length };
}
