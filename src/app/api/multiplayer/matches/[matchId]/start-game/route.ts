import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StartGameParams {
  matchId: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<StartGameParams> }
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

  // Update match state to in-progress
  const { error: updateError } = await supabase
    .from('multiplayer_matches')
    .update({
      state: 'in-progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .eq('state', 'countdown'); // Only update if in countdown

  if (updateError) {
    console.error('Failed to start game', updateError);
    return NextResponse.json({ error: 'Could not start game' }, { status: 500 });
  }

  return NextResponse.json({ status: 'game_started' });
}
