import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface StartGameParams {
  matchId: string;
}

/**
 * @swagger
 * /api/multiplayer/matches/{matchId}/start-game:
 *   post:
 *     summary: Transition a match from countdown to in-progress
 *     description: Only updates the row if it's currently in the countdown state.
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
 *         description: Game started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [game_started]
 *       400:
 *         description: Missing matchId
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
export async function POST(_request: Request, { params }: { params: Promise<StartGameParams> }) {
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
    logger.error('Failed to start game', updateError);
    return NextResponse.json({ error: 'Could not start game' }, { status: 500 });
  }

  return NextResponse.json({ status: 'game_started' });
}
