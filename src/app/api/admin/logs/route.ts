import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: List admin audit log entries
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit log page
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         description: Not an admin
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const adminClient = createAdminClient();

    const query = adminClient
      .from('admin_logs')
      .select(
        `
        id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        profiles!admin_id (username, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    const offset = (page - 1) * pageSize;
    const { data: logs, error, count } = await query.range(offset, offset + pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching logs:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
