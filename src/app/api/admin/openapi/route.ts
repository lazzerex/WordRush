import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getApiDocs } from '@/lib/openapi';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await requireAdmin();
  } catch (error: any) {
    logger.error('Error authorizing OpenAPI spec request', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json(getApiDocs());
}
