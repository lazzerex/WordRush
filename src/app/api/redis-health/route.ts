import { NextRequest, NextResponse } from 'next/server';
import { redis, isRedisConfigured } from '@/lib/redis';

export async function GET(request: NextRequest) {
  // Simple admin check: require X-ADMIN-SECRET header to match env var
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || providedSecret !== adminSecret) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin secret required.'
    }, { status: 401 });
  }
  try {
    // Check if Redis is configured
    if (!isRedisConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Redis not configured',
        message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are missing from environment variables'
      }, { status: 503 });
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
          delete: '✅'
        },
        timestamp: new Date(timestamp).toISOString(),
        environment: {
          url: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...',
          tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN
        }
      }
    });

  } catch (error) {
    console.error('Redis health check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Redis connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        configured: isRedisConfigured(),
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
