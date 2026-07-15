import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface StartCountdownParams {
  matchId: string;
}

/**
 * @swagger
 * /api/multiplayer/matches/{matchId}/start-countdown:
 *   post:
 *     summary: Transition a match from waiting/pending to countdown
 *     description: Requires both players to be marked is_ready; only updates the row if it's still in a pre-game state.
 *     tags: [Multiplayer]
 *     security:
 *       - supabaseSession: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Countdown started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [countdown_started]
 *       400:
 *         description: Missing matchId, match doesn't have exactly 2 players, or not all players ready
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
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
    logger.error('Failed to start countdown', updateError);
    return NextResponse.json({ error: 'Could not start countdown' }, { status: 500 });
  }

  return NextResponse.json({ status: 'countdown_started' });
}
