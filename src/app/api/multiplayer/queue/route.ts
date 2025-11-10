import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_DURATION = 30;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Failed to fetch user during queue POST', authError);
    return NextResponse.json({ error: 'Unable to authenticate' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('elo_rating')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.warn('Profile lookup failed, falling back to default elo', profileError);
  }

  const elo = profile?.elo_rating ?? 1000;

  const { data, error } = await supabase.rpc('enqueue_ranked_match', {
    p_user_id: user.id,
    p_elo: elo,
    p_duration: DEFAULT_DURATION,
  });

  if (error) {
    console.error('Failed to enqueue ranked match', error);
    return NextResponse.json({ error: 'Could not enqueue match' }, { status: 500 });
  }

  return NextResponse.json(data ?? { status: 'queued' });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('multiplayer_queue')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to cancel queue entry', error);
    return NextResponse.json({ error: 'Could not cancel queue' }, { status: 500 });
  }

  return NextResponse.json({ status: 'cancelled' });
}
