'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSupabase } from '@/components/SupabaseProvider';
import { getUserRank } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { User } from '@supabase/supabase-js';
import Navigation from '@/components/Navigation';
import { Medal, Award, RefreshCcw, ArrowRight, Crown } from 'lucide-react';
import AppLink from '@/components/AppLink';

type DurationOption = 15 | 30 | 60 | 120;
type RowDeltaType = 'insert' | 'move' | 'steady';

interface RowDelta {
  type: RowDeltaType;
  previousRank?: number;
}

interface LeaderboardChunk {
  entries: LeaderboardEntry[];
  total: number;
}

async function fetchLeaderboardChunk(
  duration: DurationOption,
  page: number,
  pageSize: number
): Promise<LeaderboardChunk | null> {
  try {
    const response = await fetch(
      `/api/leaderboard?duration=${duration}&page=${page}&pageSize=${pageSize}`
    );

    if (!response.ok) {
      console.error('Leaderboard API error:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      console.error('Leaderboard API returned error:', result.error);
      return null;
    }

    return { entries: result.data.entries, total: result.data.total };
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return null;
  }
}

export default function LeaderboardClient() {
  const CHUNK_SIZE = 50;
  const ROW_TRANSITION_MS = 180;
  const NEAR_TOP_THRESHOLD_PX = 120;
  const LOAD_MORE_LOOKAHEAD = 10;
  const ESTIMATED_ROW_HEIGHT = 92;

  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; total: number } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(false);
  const [hasNewScores, setHasNewScores] = useState(false);
  const [rowDeltas, setRowDeltas] = useState<Record<string, RowDelta>>({});
  const [removedRowsCount, setRemovedRowsCount] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const loadingMoreRef = useRef(false);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const isNearTopRef = useRef(true);
  const realtimeRefreshInFlightRef = useRef(false);
  const realtimePendingRef = useRef(false);

  const { supabase, isInitialized } = useSupabase();

  const rowVirtualizer = useVirtualizer({
    count: leaderboard.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    leaderboardRef.current = leaderboard;
  }, [leaderboard]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const computeRowDeltas = useCallback(
    (previousRows: LeaderboardEntry[], nextRows: LeaderboardEntry[]) => {
      const previousById = new Map<string, number>();
      const nextIds = new Set(nextRows.map((entry) => entry.id));
      const deltas: Record<string, RowDelta> = {};

      let removedCount = 0;

      previousRows.forEach((entry, index) => {
        previousById.set(entry.id, entry.rank ?? index + 1);
        if (!nextIds.has(entry.id)) {
          removedCount += 1;
        }
      });

      nextRows.forEach((entry, index) => {
        const previousRank = previousById.get(entry.id);
        const nextRank = entry.rank ?? index + 1;

        if (!previousRank) {
          deltas[entry.id] = { type: 'insert' };
          return;
        }

        if (previousRank !== nextRank) {
          deltas[entry.id] = { type: 'move', previousRank };
          return;
        }

        deltas[entry.id] = { type: 'steady', previousRank };
      });

      return {
        deltas,
        removedCount,
        changed: Object.values(deltas).some((item) => item.type !== 'steady') || removedCount > 0,
      };
    },
    []
  );

  useEffect(() => {
    // Get current user
    if (!supabase || !isInitialized) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase, isInitialized]);

  // Reset and load the first chunk whenever the selected duration changes.
  useEffect(() => {
    let cancelled = false;

    isNearTopRef.current = true;
    rowVirtualizer.scrollToOffset(0);
    setRowDeltas({});
    setRemovedRowsCount(0);
    setHasNewScores(false);
    setLoading(true);

    fetchLeaderboardChunk(selectedDuration, 1, CHUNK_SIZE).then((result) => {
      if (cancelled) return;
      if (result) {
        setLeaderboard(result.entries);
        setTotalCount(result.total);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuration]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (leaderboard.length >= totalCount) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = Math.floor(leaderboard.length / CHUNK_SIZE) + 1;
    const result = await fetchLeaderboardChunk(selectedDuration, nextPage, CHUNK_SIZE);

    if (result) {
      setLeaderboard((prev) => {
        const existingIds = new Set(prev.map((entry) => entry.id));
        const newRows = result.entries.filter((entry) => !existingIds.has(entry.id));
        return [...prev, ...newRows];
      });
      setTotalCount(result.total);
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [leaderboard.length, totalCount, selectedDuration]);

  // Auto-fetch the next chunk once the virtualizer nears the end of loaded rows.
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualIndex =
    virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : -1;

  useEffect(() => {
    if (lastVirtualIndex === -1) return;
    if (
      lastVirtualIndex >= leaderboard.length - LOAD_MORE_LOOKAHEAD &&
      leaderboard.length < totalCount
    ) {
      void loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVirtualIndex, leaderboard.length, totalCount]);

  // Refetch just the top chunk (rank 1..CHUNK_SIZE). Anything loaded beyond it is
  // dropped since a new insert shifts every rank below it - stale chunks would show
  // wrong ranks. Scrolling back down naturally re-fetches fresh chunks.
  const refreshTop = useCallback(
    async (source: 'manual' | 'realtime') => {
      if (source === 'manual') setRefreshing(true);

      const result = await fetchLeaderboardChunk(selectedDuration, 1, CHUNK_SIZE);

      if (result) {
        if (source === 'realtime') {
          const deltaResult = computeRowDeltas(
            leaderboardRef.current.slice(0, CHUNK_SIZE),
            result.entries
          );
          setRowDeltas(deltaResult.deltas);
          setRemovedRowsCount(deltaResult.removedCount);
        } else {
          setRowDeltas({});
          setRemovedRowsCount(0);
        }

        setLeaderboard(result.entries);
        setTotalCount(result.total);
        setHasNewScores(false);
      }

      if (source === 'manual') setRefreshing(false);
    },
    [selectedDuration, computeRowDeltas]
  );

  const runRealtimeRefresh = useCallback(async () => {
    if (realtimeRefreshInFlightRef.current) {
      realtimePendingRef.current = true;
      return;
    }

    realtimeRefreshInFlightRef.current = true;

    try {
      await refreshTop('realtime');
    } finally {
      realtimeRefreshInFlightRef.current = false;

      if (realtimePendingRef.current) {
        realtimePendingRef.current = false;

        if (isNearTopRef.current) {
          void runRealtimeRefresh();
        } else {
          setHasNewScores(true);
        }
      }
    }
  }, [refreshTop]);

  const resolveNewScores = useCallback(() => {
    isNearTopRef.current = true;
    rowVirtualizer.scrollToOffset(0);
    void runRealtimeRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runRealtimeRefresh]);

  const loadUserRank = useCallback(async () => {
    if (!user) {
      setUserRank(null);
      return;
    }

    const rank = await getUserRank(user.id, selectedDuration);
    setUserRank(rank);
  }, [user, selectedDuration]);

  // Subscribe to Supabase Realtime for live leaderboard updates
  useEffect(() => {
    if (!supabase || !isInitialized) return () => {};

    const channel = supabase
      .channel(`leaderboard:${selectedDuration}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'typing_results',
          filter: `duration=eq.${selectedDuration}`,
        },
        () => {
          if (isNearTopRef.current) {
            void runRealtimeRefresh();
          } else {
            setHasNewScores(true);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setLiveUpdatesEnabled(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setLiveUpdatesEnabled(false);
        } else if (status === 'TIMED_OUT') {
          setLiveUpdatesEnabled(false);
        }
      });

    return () => {
      realtimePendingRef.current = false;
      supabase.removeChannel(channel);
      setLiveUpdatesEnabled(false);
    };
  }, [selectedDuration, runRealtimeRefresh, supabase, isInitialized]);

  useEffect(() => {
    loadUserRank();
  }, [loadUserRank]);

  const handleScroll = useCallback(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    isNearTopRef.current = el.scrollTop < NEAR_TOP_THRESHOLD_PX;
  }, [NEAR_TOP_THRESHOLD_PX]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) {
      return <Crown className="w-5 h-5 text-yellow-400" aria-hidden="true" />;
    }
    if (rank === 2) {
      return <Medal className="w-5 h-5 text-zinc-300" aria-hidden="true" />;
    }
    if (rank === 3) {
      return <Award className="w-5 h-5 text-orange-400" aria-hidden="true" />;
    }
    return <span className="text-sm text-zinc-400 font-semibold">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-zinc-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-zinc-400';
  };

  const getWpmColor = (wpm: number) => {
    if (wpm >= 100) return 'text-yellow-400';
    if (wpm >= 80) return 'text-green-400';
    if (wpm >= 60) return 'text-blue-400';
    if (wpm >= 40) return 'text-orange-400';
    return 'text-zinc-400';
  };

  const isCurrentUser = (userId: string) => {
    return user?.id === userId;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const GRID_COLUMNS = 'grid-cols-[5rem_1fr_9rem_9rem_8rem]';

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12 space-y-10">
        <div className="text-center space-y-3 animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Global Leaderboard
          </div>
          <h1 className="text-4xl font-bold text-zinc-50">Chase the crown</h1>
          <p className="text-sm text-zinc-400">
            Compete with WordRush typists across every duration.
          </p>
        </div>

        {/* User Rank Card (if logged in) */}
        {user && userRank && (
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-slideInUp animation-delay-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Your standing</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-4xl font-semibold text-zinc-50">#{userRank.rank}</span>
                  <span className="text-sm text-zinc-500">out of {userRank.total} players</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{selectedDuration}s test</p>
              </div>
              <AppLink
                href="/?mode=singleplayer"
                loadingMessage="Loading typing test…"
                className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
              >
                Improve rank
                <ArrowRight className="w-4 h-4" />
              </AppLink>
            </div>
          </div>
        )}

        {/* Duration Selector */}
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm animate-slideInUp animation-delay-200">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-[0.3em] mb-6">
            Select duration
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[15, 30, 60, 120].map((duration) => (
              <button
                key={duration}
                onClick={() => setSelectedDuration(duration as DurationOption)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-smooth ${
                  selectedDuration === duration
                    ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-400 shadow-[0_15px_40px_-30px_rgba(234,179,8,0.8)] scale-105'
                    : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:scale-105'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl overflow-hidden backdrop-blur-sm animate-slideInUp animation-delay-300">
          <div className="flex flex-col gap-4 border-b border-zinc-700/60 bg-zinc-900/40 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Top scores • Loaded {leaderboard.length} of {totalCount || 0}
                </p>
                {liveUpdatesEnabled && (
                  <div
                    className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-1"
                    title="Real-time updates enabled via Supabase Realtime"
                  >
                    <div className="relative">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-green-400 font-semibold">
                      Live
                    </span>
                  </div>
                )}
                {hasNewScores && (
                  <button
                    onClick={resolveNewScores}
                    className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-300 transition-smooth hover:bg-yellow-500/20"
                    title="New scores detected"
                  >
                    <span className={prefersReducedMotion ? '' : 'animate-pulse'}>New scores</span>
                  </button>
                )}
                {removedRowsCount > 0 && (
                  <div className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                    {removedRowsCount} out
                  </div>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                {selectedDuration} second test
              </h2>
              <p className="text-sm text-zinc-500">
                {liveUpdatesEnabled
                  ? 'New scores appear instantly at the top; scroll up or tap "New scores" to refresh further down'
                  : 'Best verified runs from the community'}
              </p>
            </div>
            <button
              onClick={() => {
                isNearTopRef.current = true;
                rowVirtualizer.scrollToOffset(0);
                void refreshTop('manual');
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
              {loading || refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 animate-fadeIn">
              <div className="h-12 w-12 rounded-full border-2 border-zinc-700 border-t-yellow-500 animate-spin" />
              <p className="mt-4 text-sm">Loading leaderboard…</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 animate-fadeIn">
              <p className="text-sm">No scores yet for this duration.</p>
              <p className="mt-1 text-xs text-zinc-500">Be the first to set the pace.</p>
              <AppLink
                href="/?mode=singleplayer"
                loadingMessage="Loading typing test…"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
              >
                Set a record
                <ArrowRight className="w-4 h-4" />
              </AppLink>
            </div>
          ) : (
            <div role="table" aria-label="Leaderboard" className="animate-fadeIn">
              <div
                role="row"
                className={`grid ${GRID_COLUMNS} bg-zinc-900/40 text-left text-xs uppercase tracking-[0.3em] text-zinc-500`}
              >
                <div role="columnheader" className="px-6 py-4">
                  Rank
                </div>
                <div role="columnheader" className="px-6 py-4">
                  Player
                </div>
                <div role="columnheader" className="px-6 py-4">
                  WPM
                </div>
                <div role="columnheader" className="px-6 py-4">
                  Accuracy
                </div>
                <div role="columnheader" className="px-6 py-4">
                  When
                </div>
              </div>

              <div
                ref={scrollParentRef}
                onScroll={handleScroll}
                tabIndex={0}
                role="rowgroup"
                aria-label="Leaderboard rows, scrollable"
                className="h-[640px] overflow-y-auto overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-500/50"
              >
                <div
                  style={{
                    height: rowVirtualizer.getTotalSize(),
                    position: 'relative',
                    minWidth: '720px',
                  }}
                >
                  {virtualItems.map((virtualRow) => {
                    const entry = leaderboard[virtualRow.index];
                    if (!entry) return null;

                    return (
                      <div
                        key={entry.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        role="row"
                        className={`absolute top-0 left-0 w-full grid ${GRID_COLUMNS} border-b border-zinc-800/80 transition-smooth ${
                          rowDeltas[entry.id]?.type === 'insert'
                            ? 'bg-emerald-500/10'
                            : rowDeltas[entry.id]?.type === 'move'
                              ? 'bg-sky-500/10'
                              : isCurrentUser(entry.user_id)
                                ? 'bg-yellow-500/10'
                                : 'hover:bg-zinc-900/40'
                        }`}
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                          transitionDuration: prefersReducedMotion
                            ? '0ms'
                            : `${ROW_TRANSITION_MS}ms`,
                        }}
                      >
                        <div role="cell" className="px-6 py-5 text-lg font-semibold">
                          <div
                            className={`flex items-center gap-3 ${getRankColor(entry.rank || 0)}`}
                          >
                            {getMedalIcon(entry.rank || 0)}
                          </div>
                        </div>
                        <div role="cell" className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-sm font-semibold text-zinc-200">
                              {entry.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-100">{entry.username}</p>
                              {isCurrentUser(entry.user_id) && (
                                <p className="text-xs text-yellow-400">This is you</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div role="cell" className="px-6 py-5">
                          <div className="flex items-baseline gap-3">
                            <span className={`text-3xl font-semibold ${getWpmColor(entry.wpm)}`}>
                              {entry.wpm}
                            </span>
                            <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                              WPM
                            </span>
                          </div>
                        </div>
                        <div role="cell" className="px-6 py-5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-zinc-100">
                              {entry.accuracy}%
                            </span>
                            {entry.accuracy >= 95 && (
                              <span className="text-green-400 text-sm">precise</span>
                            )}
                          </div>
                        </div>
                        <div role="cell" className="px-6 py-5 text-sm text-zinc-500">
                          {formatDate(entry.created_at)}
                          {rowDeltas[entry.id]?.type === 'insert' && (
                            <span className="ml-2 text-emerald-400 font-semibold">new</span>
                          )}
                          {rowDeltas[entry.id]?.type === 'move' && (
                            <span className="ml-2 text-sky-400 font-semibold">moved</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-zinc-700/60 bg-zinc-900/40 px-6 py-4 text-xs uppercase tracking-[0.3em] text-zinc-500">
                <span>
                  Loaded {leaderboard.length} of {totalCount}
                </span>
                {leaderboard.length < totalCount ? (
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="rounded-2xl border border-zinc-700/60 px-4 py-2 text-xs font-semibold normal-case tracking-normal text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                ) : (
                  <span>End of leaderboard</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="pt-4 text-center animate-fadeIn animation-delay-400">
          <AppLink
            href="/?mode=singleplayer"
            loadingMessage="Loading typing test…"
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-6 py-3 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
          >
            Join the leaderboard
            <ArrowRight className="w-4 h-4" />
          </AppLink>
        </div>
      </main>
    </div>
  );
}
