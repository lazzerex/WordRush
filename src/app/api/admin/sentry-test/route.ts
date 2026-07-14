import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await requireAdmin();
  } catch (error: any) {
    logger.error('Error authorizing Sentry test error', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  throw new Error('Sentry test error - triggered manually from the admin nav');
}
