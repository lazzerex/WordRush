import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface RankedProfileStats {
  elo_rating: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  matches_played: number | null;
}

interface UseRankedProfileStatsResult {
  stats: RankedProfileStats | null;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
}

export function useRankedProfileStats(refreshTrigger?: number): UseRankedProfileStatsResult {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<RankedProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (!active) {
        return;
      }
      if (authError) {
        console.error('Failed to resolve current user for ranked stats', authError);
        setError('Could not resolve your session.');
        setIsLoading(false);
        return;
      }
      if (!user) {
        setError('Sign in to see ranked stats.');
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let active = true;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const loadStats = async () => {
      setIsLoading(true);
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('elo_rating, wins, losses, draws, matches_played')
        .eq('id', userId)
        .single();

      if (!active) {
        return;
      }

      if (profileError) {
        console.error('Failed to load ranked stats', profileError);
        setError('Unable to load ranked stats right now.');
      } else {
        console.log('📊 Loaded stats:', data);
        setStats(data as RankedProfileStats);
      }
      setIsLoading(false);
    };

    loadStats();

    channelRef = supabase
      .channel(`profile-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Profile updated via realtime:', payload.new);
          const newData = payload.new as any;
          setStats({
            elo_rating: newData.elo_rating ?? null,
            wins: newData.wins ?? null,
            losses: newData.losses ?? null,
            draws: newData.draws ?? null,
            matches_played: newData.matches_played ?? null,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime updates unavailable.');
        }
      });

    return () => {
      active = false;
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
    };
  }, [userId, supabase, refreshTrigger]);

  return {
    stats,
    isLoading,
    error,
    userId,
  };
}
