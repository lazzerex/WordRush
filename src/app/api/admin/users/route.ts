import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List/search user profiles
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
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Matched against username and email (ILIKE)
 *     responses:
 *       200:
 *         description: User page
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
 *                     users:
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
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    const adminClient = createAdminClient();

    let query = adminClient
      .from('profiles')
      .select(
        'id, username, email, created_at, coins, elo_rating, wins, losses, matches_played, is_admin',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: users, error, count } = await query;

    if (error) throw error;

    await logAdminAction(admin.userId, 'view_users', 'users', undefined, { search, page });

    return NextResponse.json({
      success: true,
      data: {
        users,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching users:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   patch:
 *     summary: Update allowed fields on a user profile
 *     description: Only is_admin and coins can be modified through this endpoint; other fields in the updates object are silently ignored.
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, updates]
 *             properties:
 *               userId:
 *                 type: string
 *               updates:
 *                 type: object
 *                 properties:
 *                   is_admin:
 *                     type: boolean
 *                   coins:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing userId
 *       403:
 *         description: Not an admin
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Only allow updating specific fields
    const allowedUpdates: any = {};
    if (updates.is_admin !== undefined) allowedUpdates.is_admin = updates.is_admin;
    if (updates.coins !== undefined) allowedUpdates.coins = updates.coins;

    const { data, error } = await adminClient
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(admin.userId, 'update_user', 'user', userId, allowedUpdates);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error('Error updating user:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   delete:
 *     summary: Delete a user account
 *     description: Cascades to related records via the Supabase auth admin API. An admin cannot delete their own account.
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
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
 *         description: Missing userId, or caller tried to delete their own account
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === admin.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete user (will cascade to related records)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) throw error;

    await logAdminAction(admin.userId, 'delete_user', 'user', userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting user:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
