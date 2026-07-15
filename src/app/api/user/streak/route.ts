import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserStreak } from '@/lib/session';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/user/streak:
 *   get:
 *     summary: Get the current user's daily streak
 *     tags: [User]
 *     security:
 *       - supabaseSession: []
 *     responses:
 *       200:
 *         description: Streak info (zeroed defaults if the user has no streak row yet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentStreak:
 *                       type: integer
 *                     longestStreak:
 *                       type: integer
 *                     lastActivityDate:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streak = await getUserStreak(user.id);

    return NextResponse.json({
      success: true,
      data: streak || {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      },
    });
  } catch (error) {
    logger.error('Error fetching user streak:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
