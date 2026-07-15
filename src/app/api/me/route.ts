import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Get current session's user profile, coin balance, and admin flag
 *     description: Returns a null user (not a 401) when unauthenticated, since this endpoint is polled by the nav on every page.
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Current session info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                       nullable: true
 *                     displayName:
 *                       type: string
 *                 coins:
 *                   type: integer
 *                 isAdmin:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logger.warn('[api/me] Auth error', authError.message);
    }

    if (!user) {
      return NextResponse.json({ user: null, coins: 0, isAdmin: false });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, coins, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.warn('[api/me] Profile fetch error', profileError.message);
    }

    const displayName =
      profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'User';

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName,
      },
      coins: profile?.coins ?? 0,
      isAdmin: profile?.is_admin ?? false,
    });
  } catch (error) {
    logger.error('[api/me] Unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
