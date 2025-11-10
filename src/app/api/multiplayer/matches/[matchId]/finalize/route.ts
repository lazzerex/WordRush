import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface FinalizeParams {
  matchId: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<FinalizeParams> }
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

  const { data, error } = await supabase.rpc('finalize_ranked_match', {
    p_match_id: matchId,
  });

  if (error) {
    console.error('Failed to finalize match', error);
    return NextResponse.json({ error: 'Could not finalize match' }, { status: 500 });
  }

  return NextResponse.json(data ?? { status: 'unknown' });
}
