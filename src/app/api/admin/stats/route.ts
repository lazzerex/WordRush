import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminStats, logAdminAction } from '@/lib/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     responses:
 *       200:
 *         description: Dashboard stats
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
 *                     totalUsers:
 *                       type: integer
 *                     totalTests:
 *                       type: integer
 *                     totalCoinsDistributed:
 *                       type: integer
 *                     activeUsersToday:
 *                       type: integer
 *                     testsToday:
 *                       type: integer
 *                     averageWpm:
 *                       type: number
 *                     topPlayers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           totalTests:
 *                             type: integer
 *                           bestWpm:
 *                             type: integer
 *                           coins:
 *                             type: integer
 *       403:
 *         description: Not an admin
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await requireAdmin();

    const rateLimitResult = await checkRateLimit(
      adminLimiter,
      getRateLimitIdentifier(request, admin.userId)
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get dashboard stats
    const stats = await getAdminStats();

    // Log action
    await logAdminAction(admin.userId, 'view_dashboard');

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching admin stats:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
