/**
 * @file rate-limiter.ts
 * @description In-memory sliding window rate limiter (no Redis required).
 * Production-ready: cleans up expired buckets to prevent memory leaks.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60_000; // purge expired keys every minute

// Auto-cleanup stale entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
}

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Epoch ms when the limit window resets */
  resetAt: number;
}

/**
 * Check and record a rate limit hit for the given key.
 *
 * @param key - Unique identifier (e.g. IP address, user ID)
 * @param limit - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Fresh window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Convenience: 20 requests per minute per IP for AI chat */
export const chatRateLimit = (ip: string) =>
  rateLimit(`chat:${ip}`, 20, 60_000);

/** Convenience: 10 requests per minute per IP for TTS */
export const ttsRateLimit = (ip: string) =>
  rateLimit(`tts:${ip}`, 10, 60_000);
