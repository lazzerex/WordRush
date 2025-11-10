import { createClient } from '@/lib/supabase/client';
import type {
  MultiplayerMatch,
  MultiplayerMatchPlayer,
} from '@/types/database';

export type QueueStatus =
  | { status: 'queued' }
  | {
      status: 'matched';
      matchId: string;
      duration: number;
      wordSequence: string[];
    };

export interface MatchBundle {
  match: MultiplayerMatch;
  players: MultiplayerMatchPlayer[];
  me?: MultiplayerMatchPlayer;
  opponent?: MultiplayerMatchPlayer;
}

export interface PlayerUpdatePayload {
  wpm?: number;
  accuracy?: number;
  progress?: number;
  is_ready?: boolean;
  is_finished?: boolean;
}

type MatchInsertCallback = (payload: MultiplayerMatchPlayer) => void;
type MatchUpdateCallback = (payload: MultiplayerMatchPlayer) => void;

type Cleanup = () => void;

export class SupabaseMultiplayerService {
  private supabase = createClient();

  async queueForRankedMatch(): Promise<QueueStatus> {
    const response = await fetch('/api/multiplayer/queue', {
      method: 'POST',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body.error ?? 'Failed to queue');
    }

    const payload = await response.json();

    if (payload?.status === 'matched' && payload.matchId) {
      return {
        status: 'matched',
        matchId: payload.matchId,
        duration: payload.duration ?? 30,
        wordSequence: payload.wordSequence ?? [],
      };
    }

    return { status: 'queued' };
  }

  async cancelQueue(): Promise<void> {
    const response = await fetch('/api/multiplayer/queue', { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body.error ?? 'Failed to cancel queue');
    }
  }

  async fetchMatch(matchId: string): Promise<MatchBundle | null> {
    const [{ data: match, error: matchError }, { data: players, error: playerError }] = await Promise.all([
      this.supabase
        .from('multiplayer_matches')
        .select('*')
        .eq('id', matchId)
        .single(),
      this.supabase
        .from('multiplayer_match_players')
        .select('*, profiles:profiles(username)')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true }),
    ]);

    console.log('fetchMatch debug:', { matchId, match, matchError, players, playerError });

    if (matchError) {
      console.error('Failed to load match', matchError);
      return null;
    }

    if (playerError) {
      console.error('Failed to load match roster', playerError);
      return null;
    }

    if (!players || players.length === 0) {
      console.error('No players found for match', matchId);
      return null;
    }

    type PlayerRow = MultiplayerMatchPlayer & {
      profiles?: { username?: string | null } | null;
    };

    const normalizedPlayers: MultiplayerMatchPlayer[] = (players as PlayerRow[]).map((player) => {
      const fallback = `Player ${player.user_id.slice(0, 8)}`;
      const displayName = player.display_name ?? player.profiles?.username ?? fallback;
      const { profiles, ...rest } = player;
      return {
        ...rest,
        display_name: displayName,
      };
    });

    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    const me = normalizedPlayers.find((p) => p.user_id === user?.id);
    const opponent = normalizedPlayers.find((p) => p.user_id !== user?.id);

    return {
      match: match!,
      players: normalizedPlayers,
      me: me ?? undefined,
      opponent: opponent ?? undefined,
    };
  }

  async updatePlayerState(matchId: string, updates: PlayerUpdatePayload): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated player');
    }

    const { error } = await this.supabase
      .from('multiplayer_match_players')
      .update(updates)
      .eq('match_id', matchId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  async finalizeMatch(matchId: string): Promise<void> {
    const response = await fetch(`/api/multiplayer/matches/${matchId}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body.error ?? 'Unable to finalize match');
    }
  }

  async subscribeToAssignments(callback: MatchInsertCallback): Promise<Cleanup> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Authentication required for matchmaking');
    }

    const channel = this.supabase
      .channel(`match-assignments-${user.id}`)
      .on('postgres_changes', {
        schema: 'public',
        table: 'multiplayer_match_players',
        event: 'INSERT',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        callback(payload.new as MultiplayerMatchPlayer);
      })
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  async findActiveAssignment(): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const freshnessCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('multiplayer_match_players')
      .select('match_id, match:multiplayer_matches!inner(id, state, created_at)')
      .eq('user_id', user.id)
      .is('result', null)
      .in('match.state', ['pending', 'countdown', 'in-progress'])
      .gt('match.created_at', freshnessCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Failed to check existing assignment', error);
      return null;
    }

    if (!data?.match_id) {
      return null;
    }

    const matchInfo = (data as any)?.match;
    const matchRecord = Array.isArray(matchInfo) ? matchInfo[0] : matchInfo;

    if (!matchRecord?.state) {
      return null;
    }

    return data.match_id;
  }

  subscribeToMatch(
    matchId: string,
    onUpdate: MatchUpdateCallback
  ): Cleanup {
    const channel = this.supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', {
        schema: 'public',
        table: 'multiplayer_match_players',
        event: 'UPDATE',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        onUpdate(payload.new as MultiplayerMatchPlayer);
      })
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

let serviceInstance: SupabaseMultiplayerService | null = null;

export function createMultiplayerService(): SupabaseMultiplayerService {
  if (!serviceInstance) {
    serviceInstance = new SupabaseMultiplayerService();
  }
  return serviceInstance;
}
