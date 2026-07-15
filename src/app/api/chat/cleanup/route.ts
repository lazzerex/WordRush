import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * Cleanup expired chat messages
 * - Guest messages older than 1 hour
 * - Authenticated messages older than 24 hours
 *
 * This endpoint should be called by Vercel Cron Jobs
 * Configure in vercel.json
 */
/**
 * @swagger
 * /api/chat/cleanup:
 *   get:
 *     summary: Delete expired chat messages (cron job)
 *     description: Called by Vercel Cron. Guest messages older than 1h and authenticated messages older than 24h are purged via the cleanup_expired_chat_messages RPC.
 *     tags: [Chat]
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Cleanup ran
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deletedCount:
 *                   type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Missing/incorrect Authorization Bearer CRON_SECRET
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Alias of GET, for cron providers that only send POST
 *     tags: [Chat]
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Cleanup ran
 *       401:
 *         description: Missing/incorrect Authorization Bearer CRON_SECRET
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Call the cleanup function
    const { data, error } = await adminClient.rpc('cleanup_expired_chat_messages');

    if (error) {
      logger.error('Error running cleanup function:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: 'Failed to execute cleanup function',
        },
        { status: 500 }
      );
    }

    const deletedCount = data || 0;

    logger.info(`Chat cleanup completed: ${deletedCount} messages deleted`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Chat cleanup cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
