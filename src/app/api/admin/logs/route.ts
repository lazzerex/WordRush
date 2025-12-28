import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const adminClient = createAdminClient();
    
    const query = adminClient
      .from('admin_logs')
      .select(`
        id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        profiles!admin_id (username, email)
      `, { count: 'exact' })
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
    console.error('Error fetching logs:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
