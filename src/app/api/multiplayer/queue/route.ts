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
  const ELO_RANGE = 200; // ±200 ELO matchmaking range
  const minElo = elo - ELO_RANGE;
  const maxElo = elo + ELO_RANGE;

  const { data, error } = await supabase.rpc('enqueue_ranked_match', {
    p_user_id: user.id,
    p_min_elo: minElo,
    p_max_elo: maxElo,
  });

  if (error) {
    console.error('Failed to enqueue ranked match', error);
    return NextResponse.json({ error: 'Could not enqueue match' }, { status: 500 });
  }

  // If matched, fetch the match details
  if (data && data.length > 0 && data[0].match_id) {
    const matchId = data[0].match_id;
    
    const { data: match, error: matchError } = await supabase
      .from('multiplayer_matches')
      .select('id, duration, word_sequence')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Failed to fetch match after queue', matchError);
      return NextResponse.json({ error: 'Match created but could not fetch details' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'matched',
      matchId: match.id,
      duration: match.duration,
      wordSequence: match.word_sequence,
    });
  }

  return NextResponse.json({ status: 'queued' });
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
