import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface AbandonParams {
  matchId: string;
}

export async function POST(_request: Request, { params }: { params: Promise<AbandonParams> }) {
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

  // Verify the requesting user is actually a participant in this match
  const { data: playerRow, error: playerError } = await supabase
    .from('multiplayer_match_players')
    .select('match_id')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (playerError || !playerRow) {
    return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
  }

  // Mark match as completed so findActiveAssignment won't resurface it.
  // Use .neq filter so this is a no-op if the match is already completed.
  const { error: updateError } = await supabase
    .from('multiplayer_matches')
    .update({ state: 'completed' })
    .eq('id', matchId)
    .neq('state', 'completed');

  if (updateError) {
    logger.error('Failed to abandon match', updateError);
    return NextResponse.json({ error: 'Could not abandon match' }, { status: 500 });
  }

  return NextResponse.json({ status: 'abandoned' });
}
