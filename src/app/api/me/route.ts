import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn('[api/me] Auth error', authError.message);
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
      console.warn('[api/me] Profile fetch error', profileError.message);
    }

    const displayName =
      profile?.username ||
      user.user_metadata?.username ||
      user.email?.split('@')[0] ||
      'User';

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
    console.error('[api/me] Unexpected error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}