import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get('language') || 'en';

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('word_pool')
      .select('word')
      .eq('language', language)
      .order('word', { ascending: true });

    if (error) {
      logger.error('[word-pool API] Error fetching word pool:', error);
      return NextResponse.json({ error: 'Failed to fetch word pool' }, { status: 500 });
    }

    const words = (data ?? [])
      .map((entry) => entry.word)
      .filter((word): word is string => Boolean(word && word.trim().length > 0));

    return NextResponse.json({ words });
  } catch (err) {
    logger.error('[word-pool API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
