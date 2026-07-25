import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';
import { getApiDocs } from '@/lib/openapi';
import { logger } from '@/lib/logger';

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
  } catch (error: any) {
    logger.error('Error authorizing OpenAPI spec request', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json(getApiDocs());
}
