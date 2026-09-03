// ═══════════════════════════════════════════════════════════════
// NexusBoard - Rate Limiter (In-Memory, OWASP A05:2021)
// ═══════════════════════════════════════════════════════════════
// Sliding window rate limiter to prevent brute force attacks.
// In production, consider using Upstash Redis for distributed rate limiting.
// ═══════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on server restart - acceptable for Vercel serverless)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many requests. Please try again later.',
};

/**
 * Check rate limit for a given key (usually IP or email).
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; retryAfterMs?: number; remaining?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Rate limit configs per endpoint type.
 */
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60 * 1000, message: 'Too many login attempts. Try again in 1 minute.' },
  register: { maxRequests: 3, windowMs: 60 * 1000, message: 'Too many registration attempts. Try again in 1 minute.' },
  passwordReset: { maxRequests: 3, windowMs: 15 * 60 * 1000, message: 'Too many password reset attempts. Try again in 15 minutes.' },
  api: { maxRequests: 100, windowMs: 60 * 1000, message: 'API rate limit exceeded.' },
} as const;
