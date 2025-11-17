import { createClient } from '@/lib/supabase/client';
import type { LeaderboardEntry } from '@/types/leaderboard';

interface RawLeaderboardResult {
  entries: any[];
  total: number;
}

async function fetchLeaderboardBatch(
  duration: number,
  limit: number,
  offset: number
): Promise<RawLeaderboardResult> {
  const supabase = createClient();
  const rangeStart = offset;
  const rangeEnd = Math.max(offset + limit - 1, offset);

  // Attempt with joined profiles for richer data
  const joinedQuery = supabase
    .from('typing_results')
    .select(
      `
        id,
        user_id,
        wpm,
        accuracy,
        created_at,
        profiles!user_id (
          username,
          email
        )
      `,
      { count: 'exact' }
    )
    .eq('duration', duration)
    .order('wpm', { ascending: false })
    .order('accuracy', { ascending: false })
    .order('created_at', { ascending: true })
    .range(rangeStart, rangeEnd);

  const { data, error, count } = await joinedQuery;

  if (!error && data) {
    return {
      entries: data,
      total: count ?? data.length,
    };
  }

  console.warn('Error fetching leaderboard with profile join, falling back without join:', error);

  const fallbackQuery = await supabase
    .from('typing_results')
    .select('id, user_id, wpm, accuracy, created_at', { count: 'exact' })
    .eq('duration', duration)
    .order('wpm', { ascending: false })
    .order('accuracy', { ascending: false })
    .order('created_at', { ascending: true })
    .range(rangeStart, rangeEnd);

  if (fallbackQuery.error || !fallbackQuery.data) {
    console.error('Fallback leaderboard query failed:', fallbackQuery.error);
    return { entries: [], total: 0 };
  }

  return {
    entries: fallbackQuery.data,
    total: fallbackQuery.count ?? fallbackQuery.data.length,
  };
}

function mapLeaderboardEntries(
  rawEntries: any[],
  offset: number,
  profileMap: Record<string, { username?: string; email?: string }>
): LeaderboardEntry[] {
  return rawEntries.map((entry: any, index: number) => {
    const usernameFromJoin = entry.profiles?.username;
    const emailFromJoin = entry.profiles?.email;
    const profile = profileMap[entry.user_id] || {};

    const username = usernameFromJoin || profile.username || `User ${entry.user_id?.slice(0, 8)}`;
    const email = emailFromJoin || profile.email || '';

    return {
      id: entry.id,
      user_id: entry.user_id,
      username,
      email,
      wpm: entry.wpm,
      accuracy: entry.accuracy,
      created_at: entry.created_at,
      rank: offset + index + 1,
    };
  });
}

export async function getLeaderboardPaginated(
  duration: number,
  limit: number = 100,
  offset: number = 0
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const supabase = createClient();
  const { entries: rawEntries, total } = await fetchLeaderboardBatch(duration, limit, offset);

  if (rawEntries.length === 0) {
    return { entries: [], total: 0 };
  }

  const userIds = Array.from(new Set(rawEntries.map((entry) => entry.user_id).filter(Boolean)));

  let profileMap: Record<string, { username?: string; email?: string }> = {};

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .in('id', userIds);

    if (!profilesError && profilesData) {
      profileMap = (profilesData as any[]).reduce((acc, profile) => {
        acc[profile.id] = {
          username: profile.username,
          email: profile.email,
        };
        return acc;
      }, {} as Record<string, { username?: string; email?: string }>);
    }
  }

  return {
    entries: mapLeaderboardEntries(rawEntries, offset, profileMap),
    total,
  };
}

export async function getLeaderboard(
  duration: number,
  limit: number = 100,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const { entries } = await getLeaderboardPaginated(duration, limit, offset);
  return entries;
}

export async function getTopScoresByDuration(): Promise<{
  [key: number]: LeaderboardEntry[];
}> {
  const durations = [15, 30, 60, 120];
  const results: { [key: number]: LeaderboardEntry[] } = {};

  // Fetch top 10 for each duration
  await Promise.all(
    durations.map(async (duration) => {
      const { entries } = await getLeaderboardPaginated(duration, 10, 0);
      results[duration] = entries;
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
