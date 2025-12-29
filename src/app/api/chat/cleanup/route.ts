import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cleanup expired chat messages
 * - Guest messages older than 1 hour
 * - Authenticated messages older than 24 hours
 * 
 * This endpoint should be called by Vercel Cron Jobs
 * Configure in vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Call the cleanup function
    const { data, error } = await adminClient.rpc('cleanup_expired_chat_messages');

    if (error) {
      console.error('Error running cleanup function:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: 'Failed to execute cleanup function'
        },
        { status: 500 }
      );
    }

    const deletedCount = data || 0;

    console.log(`Chat cleanup completed: ${deletedCount} messages deleted`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Chat cleanup cron error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
