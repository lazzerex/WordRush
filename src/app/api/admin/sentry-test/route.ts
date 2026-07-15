import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/admin/sentry-test:
 *   get:
 *     summary: Deliberately throw a 500 to verify Sentry error reporting
 *     description: Permanent admin-only test trigger, wired to the red "Sentry Test" nav button.
 *     tags: [Admin]
 *     security:
 *       - supabaseSession: []
 *     responses:
 *       500:
 *         description: Test error thrown intentionally (this is the expected outcome)
 *       403:
 *         description: Not an admin
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch (error: any) {
    logger.error('Error authorizing Sentry test error', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  throw new Error('Sentry test error - triggered manually from the admin nav');
}
