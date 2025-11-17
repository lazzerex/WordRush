import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsersCount, markUserActive } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const count = await getActiveUsersCount();
    
    return NextResponse.json({
      success: true,
      data: {
        activeUsers: count,
      },
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await markUserActive(user.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error marking user active:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
