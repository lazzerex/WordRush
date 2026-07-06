import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminStats, logAdminAction } from '@/lib/admin';
import { checkRateLimit, getRateLimitIdentifier, adminLimiter } from '@/lib/ratelimit';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await requireAdmin();

    const rateLimitResult = await checkRateLimit(adminLimiter, getRateLimitIdentifier(request, admin.userId));
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error || 'Rate limit exceeded' }, { status: 429 });
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
    console.error('Error fetching admin stats:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
