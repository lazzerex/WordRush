import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserStreak } from '@/lib/session';

export async function GET(request: NextRequest) {
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

    const streak = await getUserStreak(user.id);

    return NextResponse.json({
      success: true,
      data: streak || {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      },
    });
  } catch (error) {
    console.error('Error fetching user streak:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
