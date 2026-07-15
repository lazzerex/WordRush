import { NextRequest, NextResponse } from 'next/server';
import { redis, isRedisConfigured } from '@/lib/redis';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/redis-health:
 *   get:
 *     summary: Admin diagnostic - exercise PING/SET/GET/DEL against Redis
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     responses:
 *       200:
 *         description: Redis is configured and all operations succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Redis operation failed
 *       503:
 *         description: Redis is not configured (missing env vars)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error: any) {
    const message = error?.message || 'Unauthorized';
    const status = message.includes('Forbidden') ? 403 : 401;
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }

  try {
    // Check if Redis is configured
    if (!isRedisConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Redis not configured',
          message:
            'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are missing from environment variables',
        },
        { status: 503 }
      );
    }

    // Test Redis connection with PING
    const pingStart = Date.now();
    const pingResult = await redis.ping();
    const pingLatency = Date.now() - pingStart;

    // Test SET operation
    const testKey = `health-check:${Date.now()}`;
    await redis.set(testKey, 'test-value', { ex: 10 }); // 10 second TTL

    // Test GET operation
    const getValue = await redis.get(testKey);

    // Test DELETE operation
    await redis.del(testKey);

    // Get some Redis info
    const timestamp = Date.now();

    return NextResponse.json({
      success: true,
      message: 'Redis is connected and working!',
      details: {
        ping: pingResult,
        latency: `${pingLatency}ms`,
        operations: {
          set: '✅',
          get: getValue === 'test-value' ? '✅' : '❌',
          delete: '✅',
        },
        timestamp: new Date(timestamp).toISOString(),
        environment: {
          url: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...',
          tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        },
      },
    });
  } catch (error) {
    logger.error('Redis health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Redis connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          configured: isRedisConfigured(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
