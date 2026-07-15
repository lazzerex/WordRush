import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface FinalizeParams {
  matchId: string;
}

/**
 * @swagger
 * /api/multiplayer/matches/{matchId}/finalize:
 *   post:
 *     summary: Finalize a completed ranked match and settle ELO
 *     description: Delegates all scoring/ELO logic to the finalize_ranked_match Postgres RPC; response shape is whatever that RPC returns.
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
 *         description: RPC result (shape defined by finalize_ranked_match)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing matchId
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: RPC call failed
 */
export async function POST(_request: Request, { params }: { params: Promise<FinalizeParams> }) {
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

  const { data, error } = await supabase.rpc('finalize_ranked_match', {
    p_match_id: matchId,
  });

  if (error) {
    logger.error('Failed to finalize match', error);
    return NextResponse.json({ error: 'Could not finalize match' }, { status: 500 });
  }

  return NextResponse.json(data ?? { status: 'unknown' });
}
