import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StartCountdownParams {
  matchId: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<StartCountdownParams> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { matchId } = await params;

  if (!matchId) {
    return NextResponse.json({ error: 'Missing match id' }, { status: 400 });
  }

  // Check if both players are ready
  const { data: players, error: playersError } = await supabase
    .from('multiplayer_match_players')
    .select('is_ready')
    .eq('match_id', matchId);

  if (playersError || !players || players.length !== 2) {
    return NextResponse.json({ error: 'Invalid match state' }, { status: 400 });
  }

  const allReady = players.every((p) => p.is_ready);

  if (!allReady) {
    return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 });
  }

  // Update match state to countdown
  const { error: updateError } = await supabase
    .from('multiplayer_matches')
    .update({
      state: 'countdown',
      countdown_started_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .in('state', ['waiting', 'pending']); // Only update if still in a pre-game state

  if (updateError) {
    console.error('Failed to start countdown', updateError);
    return NextResponse.json({ error: 'Could not start countdown' }, { status: 500 });
  }

  return NextResponse.json({ status: 'countdown_started' });
}
