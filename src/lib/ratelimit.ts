import { Ratelimit } from '@upstash/ratelimit';
import { redis, isRedisConfigured } from './redis';

// Rate limiters for different endpoints
// Using sliding window algorithm for smoother rate limiting

/**
 * Test submission rate limiter
 * Prevents spam and ensures fair usage
 * Limit: 20 submissions per 60 seconds per user
 */
export const testSubmissionLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
      prefix: 'ratelimit:test-submission',
    })
  : null;

/**
 * Leaderboard API rate limiter
 * Prevents excessive API calls
 * Limit: 30 requests per 60 seconds per IP
 */
export const leaderboardLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: true,
      prefix: 'ratelimit:leaderboard',
    })
  : null;

/**
 * Authentication rate limiter
 * Prevents brute force attacks
 * Limit: 5 login attempts per 60 seconds per IP
 */
export const authLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

/**
 * Shop/Purchase rate limiter
 * Prevents rapid purchasing attempts
 * Limit: 10 purchases per 60 seconds per user
 */
export const purchaseLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:purchase',
    })
  : null;

/**
 * General API rate limiter (fallback)
 * Applied to unspecified endpoints
 * Limit: 60 requests per 60 seconds per IP
 */
export const generalLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      analytics: true,
      prefix: 'ratelimit:general',
    })
  : null;

/**
 * Helper to check rate limit and return standardized response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  error?: string;
}> {
  if (!limiter) {
    // Rate limiting disabled (Redis not configured)
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
      error: success ? undefined : 'Rate limit exceeded. Please try again later.',
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return { success: true };
  }
}

/**
 * Get client identifier for rate limiting
 * Uses user ID if authenticated, otherwise falls back to IP address
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers (works on Vercel and other platforms)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}
