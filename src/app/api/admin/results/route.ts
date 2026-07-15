import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/admin/results:
 *   get:
 *     summary: List typing test results with owning profile joined in
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
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *         description: Filter by test duration in seconds
 *     responses:
 *       200:
 *         description: Results page
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
 *                     results:
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
    const duration = searchParams.get('duration');

    const adminClient = createAdminClient();

    let query = adminClient
      .from('typing_results')
      .select(
        `
        id,
        user_id,
        wpm,
        accuracy,
        duration,
        created_at
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (duration) {
      query = query.eq('duration', parseInt(duration));
    }

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: results, error, count } = await query;

    if (error) throw error;

    // Fetch profile data separately for each result
    if (results && results.length > 0) {
      const userIds = Array.from(new Set(results.map((r) => r.user_id)));

      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      // Map profiles to results
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      results.forEach((result: any) => {
        const profile = profileMap.get(result.user_id);
        result.profiles = {
          username: profile?.username || 'Unknown',
          email: profile?.email || 'Unknown',
        };
      });
    }

    await logAdminAction(admin.userId, 'view_results', 'results', undefined, { duration, page });

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching results:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/admin/results:
 *   delete:
 *     summary: Delete a typing test result
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     parameters:
 *       - in: query
 *         name: resultId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Result deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing resultId
 *       403:
 *         description: Not an admin
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
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
    const resultId = searchParams.get('resultId');

    if (!resultId) {
      return NextResponse.json({ error: 'Result ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete result
    const { error } = await adminClient.from('typing_results').delete().eq('id', resultId);

    if (error) throw error;

    await logAdminAction(admin.userId, 'delete_result', 'result', resultId);

    return NextResponse.json({
      success: true,
      message: 'Result deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting result:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}
