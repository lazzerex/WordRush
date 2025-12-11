import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createMultiplayerService,
  type MatchBundle,
  type QueueStatus,
  type PlayerUpdatePayload,
  type SupabaseMultiplayerService,
} from '@/services/multiplayerService';
import type { MultiplayerMatch, MultiplayerMatchPlayer } from '@/types/database';

export type QueuePhase = 'idle' | 'queueing' | 'queued' | 'matched' | 'playing' | 'completed';

interface UseMultiplayerMatchResult {
  phase: QueuePhase;
  match: MultiplayerMatch | null;
  me: MultiplayerMatchPlayer | null;
  opponent: MultiplayerMatchPlayer | null;
  wordSequence: string[];
  error: string | null;
  startQueue: () => Promise<void>;
  cancelQueue: () => Promise<void>;
  updatePlayer: (updates: PlayerUpdatePayload) => Promise<void>;
  finalizeMatch: () => Promise<void>;
  resetMatch: () => void;
}

export function useMultiplayerMatch(): UseMultiplayerMatchResult {
  const service = useMemo<SupabaseMultiplayerService>(() => createMultiplayerService(), []);
  const [phase, setPhase] = useState<QueuePhase>('idle');
  const [match, setMatch] = useState<MultiplayerMatch | null>(null);
  const [me, setMe] = useState<MultiplayerMatchPlayer | null>(null);
  const [opponent, setOpponent] = useState<MultiplayerMatchPlayer | null>(null);
  const [wordSequence, setWordSequence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const assignmentCleanup = useRef<(() => void) | null>(null);
  const matchCleanup = useRef<(() => void) | null>(null);
  const matchStateCleanup = useRef<(() => void) | null>(null);
  const finalizeRequested = useRef(false);
  const playerNameMap = useRef<Map<string, string>>(new Map());

  const resetMatch = useCallback(() => {
    setMatch(null);
    setMe(null);
    setOpponent(null);
    setWordSequence([]);
    setPhase('idle');
    setError(null);
    finalizeRequested.current = false;
    
    // Clean up all subscriptions
    if (assignmentCleanup.current) {
      assignmentCleanup.current();
      assignmentCleanup.current = null;
    }
    if (matchCleanup.current) {
      matchCleanup.current();
      matchCleanup.current = null;
    }
    if (matchStateCleanup.current) {
      matchStateCleanup.current();
      matchStateCleanup.current = null;
    }
    
    playerNameMap.current.clear();
  }, []);

  const hydrateMatch = useCallback(
    async (matchId: string, optimisticWords: string[] | undefined = undefined) => {
      try {
        const bundle = await service.fetchMatch(matchId);
        if (!bundle) {
          throw new Error('Match not found');
        }

        applyBundle(bundle, optimisticWords);
      } catch (err) {
        console.error('Failed to hydrate match', err);
        setError((err as Error).message ?? 'Unable to load match');
        setPhase('idle');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service]
  );

  const applyBundle = useCallback((bundle: MatchBundle, fallbackWords?: string[]) => {
    const playerMap = new Map(bundle.players.map((player) => [player.user_id, player]));
    const nextNameMap = new Map(playerNameMap.current);

    bundle.players.forEach((player) => {
      const fallback = `Player ${player.user_id.slice(0, 8)}`;
      const existingName = player.display_name ?? nextNameMap.get(player.user_id) ?? fallback;
      nextNameMap.set(player.user_id, existingName);
    });

    const ensureDisplayName = (player: MultiplayerMatchPlayer | null | undefined): MultiplayerMatchPlayer | null => {
      if (!player) {
        return null;
      }
      const fallback = `Player ${player.user_id.slice(0, 8)}`;
      const existingName = nextNameMap.get(player.user_id) ?? fallback;
      return {
        ...player,
        display_name: existingName,
      };
    };

    const inferredMe = bundle.me ?? null;
    const meId = inferredMe?.user_id ?? bundle.players[0]?.user_id;
    const inferredOpponent = bundle.opponent ?? (meId ? bundle.players.find((p) => p.user_id !== meId) ?? null : null);
    const opponentId = inferredOpponent?.user_id;

    setMatch(bundle.match);
    setMe(ensureDisplayName(inferredMe ?? (meId ? playerMap.get(meId) ?? null : null)));
    setOpponent(ensureDisplayName(inferredOpponent ?? (opponentId ? playerMap.get(opponentId) ?? null : null)));
    setWordSequence(bundle.match.word_sequence?.length ? bundle.match.word_sequence : fallbackWords ?? []);
    setPhase('playing');
    playerNameMap.current = nextNameMap;

    matchCleanup.current?.();
    matchCleanup.current = null;
    matchStateCleanup.current?.();
    matchStateCleanup.current = null;

    matchCleanup.current = service.subscribeToMatch(bundle.match.id, (payload) => {
      playerNameMap.current.set(
        payload.user_id,
        playerNameMap.current.get(payload.user_id) ?? `Player ${payload.user_id.slice(0, 8)}`
      );
      if (payload.user_id === meId) {
        setMe((prev) => {
          const displayName = playerNameMap.current.get(payload.user_id) ?? prev?.display_name ?? `Player ${payload.user_id.slice(0, 8)}`;
          playerNameMap.current.set(payload.user_id, displayName);
          return {
            ...(prev ?? payload),
            ...payload,
            display_name: displayName,
          };
        });
        return;
      }
      if (payload.user_id === opponentId || !opponentId) {
        setOpponent((prev) => {
          const displayName = playerNameMap.current.get(payload.user_id) ?? prev?.display_name ?? `Player ${payload.user_id.slice(0, 8)}`;
          playerNameMap.current.set(payload.user_id, displayName);
          return {
            ...(prev ?? payload),
            ...payload,
            display_name: displayName,
          };
        });
      }
    });

    // Subscribe to match state changes (countdown, in-progress, etc.)
    matchStateCleanup.current = service.subscribeToMatchState(bundle.match.id, (updatedMatch) => {
      setMatch(updatedMatch);
    });
  }, [service]);

  const startQueue = useCallback(async () => {
    setError(null);
    
    // Clean up any existing subscriptions first
    if (assignmentCleanup.current) {
      assignmentCleanup.current();
      assignmentCleanup.current = null;
    }
    
    try {
      const existingMatchId = await service.findActiveAssignment();
      if (existingMatchId) {
        setPhase('matched');
        await hydrateMatch(existingMatchId);
        return;
      }
    } catch (err) {
      console.error('Failed to inspect active assignments', err);
    }

    setPhase('queueing');

    try {
      // Create fresh assignment subscription for new queue session
      assignmentCleanup.current = await service.subscribeToAssignments(async (payload) => {
        setPhase('matched');
        await hydrateMatch(payload.match_id);
      });

      const response: QueueStatus = await service.queueForRankedMatch();

      if (response.status === 'matched') {
        setPhase('matched');
        await hydrateMatch(response.matchId, response.wordSequence);
        return;
      }

      setPhase('queued');
    } catch (err) {
      console.error('Matchmaking failed', err);
      setError((err as Error).message ?? 'Unable to queue');
      setPhase('idle');
      // Clean up on error
      if (assignmentCleanup.current) {
        assignmentCleanup.current();
        assignmentCleanup.current = null;
      }
    }
  }, [service, hydrateMatch]);

  const cancelQueue = useCallback(async () => {
    try {
      await service.cancelQueue();
    } catch (err) {
      console.error('Failed to cancel queue', err);
    } finally {
      // Clean up assignment subscription to prevent ghost matches
      assignmentCleanup.current?.();
      assignmentCleanup.current = null;
      resetMatch();
    }
  }, [service, resetMatch]);

  const updatePlayer = useCallback(
    async (updates: PlayerUpdatePayload) => {
      if (!match) {
        return;
      }
      try {
        await service.updatePlayerState(match.id, updates);
      } catch (err) {
        console.error('Failed to update player state', err);
        setError((err as Error).message ?? 'Unable to sync progress');
      }
    },
    [match, service]
  );

  const finalizeMatch = useCallback(async () => {
    if (!match) {
      return;
    }
    try {
      await service.finalizeMatch(match.id);
      setPhase('completed');
      finalizeRequested.current = true;
    } catch (err) {
      console.error('Failed to finalize match', err);
      setError((err as Error).message ?? 'Unable to finalize match');
    }
  }, [match, service]);

  useEffect(() => {
    return () => {
      assignmentCleanup.current?.();
      matchCleanup.current?.();
      matchStateCleanup.current?.();
    };
  }, []);

  useEffect(() => {
    if (!match) {
      finalizeRequested.current = false;
      return;
    }

    if (phase !== 'playing') {
      return;
    }

    if (me?.is_finished && opponent?.is_finished && !finalizeRequested.current) {
      finalizeRequested.current = true;
      finalizeMatch().catch((err) => console.error(err));
    }
  }, [phase, me?.is_finished, opponent?.is_finished, finalizeMatch, match]);

  return {
    phase,
    match,
    me,
    opponent,
    wordSequence,
    error,
    startQueue,
    cancelQueue,
    updatePlayer,
    finalizeMatch,
    resetMatch,
  };
}
