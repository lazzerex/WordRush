import { Ratelimit } from '@upstash/ratelimit';
import { redis, isRedisConfigured } from './redis';
import { LRUCache } from 'lru-cache';
// Fallback in-memory rate limiter (used if Redis is down)
const memoryLimiter = new LRUCache<string, number[]>({
  max: 10000, // max unique identifiers
  ttl: 60000 // 1 minute
});

function fallbackRateLimit(identifier: string, limit: number): boolean {
  const now = Date.now();
  const requests = memoryLimiter.get(identifier) || [];
  // Remove requests older than 1 minute
  const recent = requests.filter((time: number) => now - time < 60000);
  if (recent.length >= limit) {
    return false;
  }
  recent.push(now);
  memoryLimiter.set(identifier, recent);
  return true;
}

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
 * Chat message rate limiter
 * Prevents chat spam
 * Limit: 5 messages per 60 seconds per user/guest
 */
export const chatLimiter = isRedisConfigured()
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null;

/**
 * Helper to check rate limit and return standardized response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackLimit: number = 20 // default fallback limit per minute
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  error?: string;
}> {
  if (!limiter) {
    // Rate limiting disabled (Redis not configured)
    console.warn('Rate limiting disabled - Redis not configured');
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
    console.error('Rate limit check error - FAILING CLOSED:', error);
    // Fail closed: fallback to in-memory limiter
    const allowed = fallbackRateLimit(identifier, fallbackLimit);
    if (!allowed) {
      return {
        success: false,
        error: 'Rate limiting temporarily unavailable. Please try again.'
      };
    }
    // If allowed by fallback, return limited info
    return {
      success: true,
      error: 'Redis unavailable, using fallback rate limiter.'
    };
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
