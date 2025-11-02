import { createClient } from '@/lib/supabase/client';
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function getLeaderboard(
  duration: number,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  // First, try to fetch with profiles join
  let { data, error } = await supabase
    .from('typing_results')
    .select(`
      id,
      user_id,
      wpm,
      accuracy,
      created_at,
      profiles:user_id (
        username,
        email
      )
    `)
    .eq('duration', duration)
    .order('wpm', { ascending: false })
    .order('accuracy', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  // If profiles join fails, try without it (fallback)
  if (error) {
    console.warn('Error fetching with profiles, trying without:', error);
    
    const fallbackQuery = await supabase
      .from('typing_results')
      .select('id, user_id, wpm, accuracy, created_at')
      .eq('duration', duration)
      .order('wpm', { ascending: false })
      .order('accuracy', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (fallbackQuery.error) {
      console.error('Error fetching leaderboard (fallback also failed):', fallbackQuery.error);
      console.error('Error details:', JSON.stringify(fallbackQuery.error, null, 2));
      return [];
    }
    
    data = fallbackQuery.data as any;
    error = null;
  }

  // Transform the data to match our interface
  const leaderboard: LeaderboardEntry[] = (data || []).map((entry: any, index: number) => {
    const username = entry.profiles?.username || `User ${entry.user_id.slice(0, 8)}`;
    const email = entry.profiles?.email || '';
    
    return {
      id: entry.id,
      user_id: entry.user_id,
      username: username,
      email: email,
      wpm: entry.wpm,
      accuracy: entry.accuracy,
      created_at: entry.created_at,
      rank: index + 1,
    };
  });

  return leaderboard;
}

export async function getTopScoresByDuration(): Promise<{
  [key: number]: LeaderboardEntry[];
}> {
  const durations = [15, 30, 60, 120];
  const results: { [key: number]: LeaderboardEntry[] } = {};

  // Fetch top 10 for each duration
  await Promise.all(
    durations.map(async (duration) => {
      results[duration] = await getLeaderboard(duration, 10);
    })
  );

  return results;
}

export async function getUserRank(
  userId: string,
  duration: number
): Promise<{ rank: number; total: number } | null> {
  const supabase = createClient();

  // Get user's best score for this duration
  const { data: userBest, error: userError } = await supabase
    .from('typing_results')
    .select('wpm, accuracy, created_at')
    .eq('user_id', userId)
    .eq('duration', duration)
    .order('wpm', { ascending: false })
    .order('accuracy', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (userError || !userBest) {
    return null;
  }

  // Count how many better scores exist
  const { count: betterCount, error: countError } = await supabase
    .from('typing_results')
    .select('*', { count: 'exact', head: true })
    .eq('duration', duration)
    .or(`wpm.gt.${userBest.wpm},and(wpm.eq.${userBest.wpm},accuracy.gt.${userBest.accuracy})`);

  // Get total unique users for this duration
  const { count: totalCount } = await supabase
    .from('typing_results')
    .select('user_id', { count: 'exact', head: true })
    .eq('duration', duration);

  if (countError) {
    return null;
  }

  return {
    rank: (betterCount || 0) + 1,
    total: totalCount || 0,
  };
}

// Subscribe to real-time updates
export function subscribeToLeaderboard(
  duration: number,
  callback: (entry: LeaderboardEntry) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`leaderboard-${duration}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'typing_results',
        filter: `duration=eq.${duration}`,
      },
      async (payload) => {
        // Fetch the user data for the new entry
        const { data: userData } = await supabase
          .from('typing_results')
          .select(`
            id,
            user_id,
            wpm,
            accuracy,
            created_at,
            profiles:user_id (
              username,
              email
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (userData) {
          const username = (userData as any).profiles?.username || 'Anonymous';
          const email = (userData as any).profiles?.email || '';
          
          callback({
            id: userData.id,
            user_id: userData.user_id,
            username: username,
            email: email,
            wpm: userData.wpm,
            accuracy: userData.accuracy,
            created_at: userData.created_at,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
