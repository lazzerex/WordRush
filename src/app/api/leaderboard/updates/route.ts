import { NextRequest } from 'next/server';
import { redis, LEADERBOARD_KEYS, isRedisConfigured } from '@/lib/redis';

// Use Node.js runtime for better SSE support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const duration = parseInt(searchParams.get('duration') || '30');

  // Validate duration
  if (![15, 30, 60, 120].includes(duration)) {
    return new Response('Invalid duration', { status: 400 });
  }

  // Check if Redis is configured
  if (!isRedisConfigured()) {
    return new Response('Real-time updates not available', { status: 503 });
  }

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Function to send SSE message
  const sendMessage = async (data: any) => {
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
      );
    } catch (error) {
      console.error('Error writing to stream:', error);
    }
  };

  // Send initial connection message
  sendMessage({ type: 'connected', duration });

  // Keep alive interval
  const keepAliveInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': keep-alive\n\n'));
    } catch (error) {
      clearInterval(keepAliveInterval);
    }
  }, 30000); // Every 30 seconds

  // Subscribe to Redis pub/sub for leaderboard updates
  const updateChannel = LEADERBOARD_KEYS.updates(duration);
  
  // Poll Redis for published events (Upstash REST doesn't support blocking pub/sub)
  // Check every 1 second for new update notifications
  let lastCheckTime = Date.now();
  const checkInterval = setInterval(async () => {
    try {
      // Use a Redis key to track last update timestamp per duration
      const lastUpdateKey = `last_update:${duration}`;
      const lastUpdate = await redis.get(lastUpdateKey);
      
      if (lastUpdate && typeof lastUpdate === 'number' && lastUpdate > lastCheckTime) {
        // New update detected! Notify client to refresh
        console.log(`🔥 SSE: New entry detected for duration ${duration}, notifying clients`);
        await sendMessage({
          type: 'new_entry',
          timestamp: lastUpdate,
          duration,
        });
        lastCheckTime = lastUpdate;
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, 1000); // Check every 1 second

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(checkInterval);
    clearInterval(keepAliveInterval);
    writer.close().catch(() => {});
  });

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
