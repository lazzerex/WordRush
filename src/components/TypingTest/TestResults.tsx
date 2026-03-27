/**
 * TestResults Component
 * Displays test completion screen with stats and actions
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { RotateCcw, Coins, Eye, Trophy, ChevronRight, Globe } from 'lucide-react';
import StatsChart from '../StatsChart';
import AppLink from '../AppLink';
import { getUserRank } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';

interface TestResultsProps {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
  coinsEarned?: number | null;
  latestResultId?: string | null;
  latestResultUserId?: string | null;
  latestResultCreatedAt?: string | null;
  onReset: () => void;
}

export const TestResults: React.FC<TestResultsProps> = ({
  wpm,
  accuracy,
  correctChars,
  incorrectChars,
  duration,
  coinsEarned,
  latestResultId,
  latestResultUserId,
  latestResultCreatedAt,
  onReset,
}) => {
  const PREVIEW_SIZE = 7;
  const CONTEXT_BATCH_SIZE = 21;
  const MIN_REFRESH_INTERVAL_MS = 3500;
  const LIVE_REFRESH_INTERVAL_MS = 5000;
  const UPDATE_HINT_TTL_MS = 2200;
  const ROW_TRANSITION_MS = 180;

  type WindowContext = 'Top' | 'Around You';
  type RowDeltaType = 'insert' | 'move' | 'steady';

  interface RowDelta {
    type: RowDeltaType;
    previousRank?: number;
  }

  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false);
  const [previewEntries, setPreviewEntries] = useState<LeaderboardEntry[]>([]);
  const [windowContext, setWindowContext] = useState<WindowContext>('Top');
  const [updateHint, setUpdateHint] = useState<'updating' | 'new' | null>(null);
  const [rowDeltas, setRowDeltas] = useState<Record<string, RowDelta>>({});
  const [removedRowsCount, setRemovedRowsCount] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const scheduledRefreshRef = useRef<number | null>(null);
  const updateHintTimerRef = useRef<number | null>(null);
  const lastRefreshAtRef = useRef(0);
  const previewEntriesRef = useRef<LeaderboardEntry[]>([]);

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

  useEffect(() => {
    previewEntriesRef.current = previewEntries;
  }, [previewEntries]);

  const clearUpdateHintTimer = useCallback(() => {
    if (updateHintTimerRef.current !== null) {
      window.clearTimeout(updateHintTimerRef.current);
      updateHintTimerRef.current = null;
    }
  }, []);

  const queueUpdateHintClear = useCallback(() => {
    clearUpdateHintTimer();
    updateHintTimerRef.current = window.setTimeout(() => {
      setUpdateHint(null);
      updateHintTimerRef.current = null;
    }, UPDATE_HINT_TTL_MS);
  }, [UPDATE_HINT_TTL_MS, clearUpdateHintTimer]);

  const computeRowDeltas = useCallback((
    previousRows: LeaderboardEntry[],
    nextRows: LeaderboardEntry[]
  ) => {
    const previousById = new Map<string, { rank: number }>();
    const nextIds = new Set(nextRows.map((entry) => entry.id));
    const deltas: Record<string, RowDelta> = {};

    let insertedCount = 0;
    let movedCount = 0;
    let removedCount = 0;

    previousRows.forEach((entry, index) => {
      const effectiveRank = entry.rank ?? index + 1;
      previousById.set(entry.id, { rank: effectiveRank });

      if (!nextIds.has(entry.id)) {
        removedCount += 1;
      }
    });

    nextRows.forEach((entry, index) => {
      const previous = previousById.get(entry.id);
      const nextRank = entry.rank ?? index + 1;

      if (!previous) {
        deltas[entry.id] = { type: 'insert' };
        insertedCount += 1;
        return;
      }

      if (previous.rank !== nextRank) {
        deltas[entry.id] = { type: 'move', previousRank: previous.rank };
        movedCount += 1;
        return;
      }

      deltas[entry.id] = { type: 'steady', previousRank: previous.rank };
    });

    return { deltas, insertedCount, movedCount, removedCount };
  }, []);

  const fetchLeaderboardWindow = useCallback(async (
    rank: number,
    total: number
  ): Promise<LeaderboardEntry[]> => {
    const maxWindowStart = Math.max(1, total - PREVIEW_SIZE + 1);
    const targetStart = Math.max(
      1,
      Math.min(rank - Math.floor(PREVIEW_SIZE / 2), maxWindowStart)
    );
    const targetEnd = targetStart + PREVIEW_SIZE - 1;

    const contextStart = Math.max(1, targetStart - PREVIEW_SIZE);
    const contextPage = Math.floor((contextStart - 1) / CONTEXT_BATCH_SIZE) + 1;

    const response = await fetch(
      `/api/leaderboard?duration=${duration}&page=${contextPage}&pageSize=${CONTEXT_BATCH_SIZE}`
    );
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      return [];
    }

    const contextEntries: LeaderboardEntry[] = payload.data.entries || [];
    const byRank = contextEntries
      .filter((entry) => typeof entry.rank === 'number')
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const focusedWindow = byRank.filter((entry) => {
      const rankValue = entry.rank || 0;
      return rankValue >= targetStart && rankValue <= targetEnd;
    });

    if (focusedWindow.length >= PREVIEW_SIZE) {
      return focusedWindow.slice(0, PREVIEW_SIZE);
    }

    if (byRank.length === 0) {
      return [];
    }

    const fallbackStartIndex = Math.max(
      0,
      byRank.findIndex((entry) => (entry.rank || 0) >= targetStart)
    );

    return byRank.slice(fallbackStartIndex, fallbackStartIndex + PREVIEW_SIZE);
  }, [CONTEXT_BATCH_SIZE, PREVIEW_SIZE, duration]);

  const loadMiniLeaderboard = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    inFlightRef.current = true;

    const hasExistingRows = previewEntriesRef.current.length > 0;
    if (hasExistingRows) {
      setRefreshingLeaderboard(true);
      setUpdateHint('updating');
    } else {
      setLoadingLeaderboard(true);
    }

    try {
      const topResponse = await fetch(
        `/api/leaderboard?duration=${duration}&page=1&pageSize=${PREVIEW_SIZE}`
      );
      const topPayload = await topResponse.json();

      if (!topResponse.ok || !topPayload?.success) {
        if (!hasExistingRows) {
          setPreviewEntries([]);
        }
        return;
      }

      const topEntries: LeaderboardEntry[] = topPayload.data.entries || [];
      const total: number = Number(topPayload.data.total || 0);

      let nextContext: WindowContext = 'Top';
      let nextEntries: LeaderboardEntry[] = topEntries.slice(0, PREVIEW_SIZE);
      let latestRank: number | undefined;

      if (latestResultUserId) {
        const userRank = await getUserRank(latestResultUserId, duration);
        latestRank = userRank?.rank;
      }

      if (latestRank && latestRank > PREVIEW_SIZE && total > PREVIEW_SIZE) {
        const contextualRows = await fetchLeaderboardWindow(latestRank, total);
        if (contextualRows.length > 0) {
          nextContext = 'Around You';
          nextEntries = contextualRows.slice(0, PREVIEW_SIZE);
        }
      }

      const latestAlreadyShown = !!latestResultId && nextEntries.some((entry) => entry.id === latestResultId);
      if (!latestAlreadyShown && latestResultId) {
        const syntheticCurrentEntry: LeaderboardEntry = {
          id: latestResultId,
          user_id: latestResultUserId || 'current-user',
          username: 'You',
          email: '',
          wpm,
          accuracy,
          created_at: latestResultCreatedAt || new Date().toISOString(),
          rank: latestRank,
        };

        nextEntries = [...nextEntries.slice(0, Math.max(0, PREVIEW_SIZE - 1)), syntheticCurrentEntry];
      }

      const previousRows = previewEntriesRef.current;
      const { deltas, insertedCount, movedCount, removedCount } = computeRowDeltas(previousRows, nextEntries);
      const hasDeltaChanges = insertedCount + movedCount + removedCount > 0;

      setWindowContext(nextContext);
      setPreviewEntries(nextEntries);
      setRowDeltas(deltas);
      setRemovedRowsCount(removedCount);

      if (hasExistingRows && hasDeltaChanges) {
        setUpdateHint('new');
        queueUpdateHintClear();
      } else {
        clearUpdateHintTimer();
        setUpdateHint(null);
      }
    } catch (error) {
      console.error('Failed to load mini leaderboard:', error);
      if (!hasExistingRows) {
        setPreviewEntries([]);
      }
      clearUpdateHintTimer();
      setUpdateHint(null);
    } finally {
      inFlightRef.current = false;
      lastRefreshAtRef.current = Date.now();
      setLoadingLeaderboard(false);
      setRefreshingLeaderboard(false);

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        const elapsed = Date.now() - lastRefreshAtRef.current;
        const wait = Math.max(0, MIN_REFRESH_INTERVAL_MS - elapsed);

        if (scheduledRefreshRef.current === null) {
          scheduledRefreshRef.current = window.setTimeout(() => {
            scheduledRefreshRef.current = null;
            void loadMiniLeaderboard();
          }, wait);
        }
      }
    }
  }, [
    PREVIEW_SIZE,
    MIN_REFRESH_INTERVAL_MS,
    duration,
    latestResultCreatedAt,
    latestResultId,
    latestResultUserId,
    wpm,
    accuracy,
    computeRowDeltas,
    fetchLeaderboardWindow,
    queueUpdateHintClear,
    clearUpdateHintTimer,
  ]);

  const requestMiniLeaderboardRefresh = useCallback((force = false) => {
    if (!showLeaderboard) {
      return;
    }

    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    const elapsed = Date.now() - lastRefreshAtRef.current;
    if (!force && elapsed < MIN_REFRESH_INTERVAL_MS) {
      const wait = MIN_REFRESH_INTERVAL_MS - elapsed;
      if (scheduledRefreshRef.current === null) {
        scheduledRefreshRef.current = window.setTimeout(() => {
          scheduledRefreshRef.current = null;
          void loadMiniLeaderboard();
        }, wait);
      }
      return;
    }

    void loadMiniLeaderboard();
  }, [MIN_REFRESH_INTERVAL_MS, showLeaderboard, loadMiniLeaderboard]);

  useEffect(() => {
    requestMiniLeaderboardRefresh(true);
  }, [requestMiniLeaderboardRefresh]);

  useEffect(() => {
    if (!showLeaderboard) {
      return;
    }

    const warmupTimer = setTimeout(() => {
      requestMiniLeaderboardRefresh(false);
    }, 1200);

    const interval = setInterval(() => {
      requestMiniLeaderboardRefresh(false);
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(warmupTimer);
      clearInterval(interval);
    };
  }, [showLeaderboard, LIVE_REFRESH_INTERVAL_MS, requestMiniLeaderboardRefresh]);

  useEffect(() => {
    return () => {
      if (scheduledRefreshRef.current !== null) {
        window.clearTimeout(scheduledRefreshRef.current);
      }
      clearUpdateHintTimer();
    };
  }, [clearUpdateHintTimer]);

  const rowsToRender = useMemo(() => previewEntries, [previewEntries]);

  const isLatestEntry = (entry: LeaderboardEntry) => {
    return !!latestResultId && entry.id === latestResultId;
  };

  return (
    <div className="animate-scaleIn">
      <div className="bg-zinc-800/30 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-left space-y-1 animate-fadeIn">
            <h2 className="text-2xl font-bold text-zinc-50">Test Complete!</h2>
            <p className="text-sm text-zinc-400">Your score is in. Check where you landed.</p>
          </div>

          <button
            onClick={() => setShowLeaderboard((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-smooth hover:border-zinc-500 hover:text-zinc-100"
            aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
            title={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
          >
            {showLeaderboard ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span className="sr-only">Hide leaderboard</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Show leaderboard
              </>
            )}
          </button>
        </div>

        <div className={`grid gap-6 ${showLeaderboard ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-6">
            {typeof coinsEarned === 'number' && coinsEarned > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 animate-fadeIn animation-delay-100">
                <div className="flex items-center justify-center gap-3">
                  <Coins className="w-6 h-6 text-yellow-500" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">+{coinsEarned} WRCoins</div>
                    <div className="text-xs text-zinc-400">Great job! Keep it up!</div>
                  </div>
                </div>
              </div>
            )}

            <div className="animate-fadeIn animation-delay-200">
              <StatsChart
                wpm={wpm}
                accuracy={accuracy}
                correctChars={correctChars}
                incorrectChars={incorrectChars}
                duration={duration}
              />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 animate-fadeIn animation-delay-400">
              <button
                onClick={onReset}
                className="px-6 py-2.5 bg-yellow-600 text-zinc-900 rounded-xl hover:bg-yellow-500 transition-smooth font-medium flex items-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>

          {showLeaderboard && (
            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/50 p-4 md:p-5 animate-fadeIn">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live leaderboard</p>
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    {windowContext} {PREVIEW_SIZE} for {duration}s
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="min-h-[24px]">
                    {refreshingLeaderboard || updateHint === 'new' || removedRowsCount > 0 ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-300">
                        {refreshingLeaderboard || updateHint === 'updating'
                          ? 'Updating'
                          : updateHint === 'new'
                            ? 'New scores'
                            : `${removedRowsCount} out`}
                      </span>
                    ) : null}
                  </div>

                  <AppLink
                    href={`/leaderboard?duration=${duration}`}
                    loadingMessage="Loading leaderboard..."
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-smooth"
                  >
                    See full
                    <ChevronRight className="w-3.5 h-3.5" />
                  </AppLink>
                </div>
              </div>

              <div className="space-y-2">
                {loadingLeaderboard && rowsToRender.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: PREVIEW_SIZE }).map((_, index) => (
                      <div
                        key={`skeleton-${index}`}
                        className="h-11 rounded-xl bg-zinc-800/70 animate-pulse-soft"
                      />
                    ))}
                  </div>
                ) : rowsToRender.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
                    No scores yet. Set the first record.
                  </div>
                ) : (
                  rowsToRender.map((entry, index) => {
                    const highlighted = isLatestEntry(entry);
                    const delta = rowDeltas[entry.id];

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-smooth ${
                          highlighted
                            ? 'border-yellow-500/60 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(234,179,8,0.2)]'
                            : delta?.type === 'insert'
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : delta?.type === 'move'
                                ? 'border-sky-500/50 bg-sky-500/10'
                                : 'border-zinc-800 bg-zinc-900/40'
                        }`}
                        style={{
                          transitionDelay: `${index * 60}ms`,
                          transitionDuration: prefersReducedMotion ? '0ms' : `${ROW_TRANSITION_MS}ms`,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`font-semibold ${highlighted ? 'text-yellow-300' : 'text-zinc-300'}`}>
                              #{entry.rank || '-'}
                            </span>
                            <span className={`truncate ${highlighted ? 'text-yellow-200' : 'text-zinc-200'}`}>
                              {highlighted ? 'You' : entry.username}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {highlighted
                              ? 'Latest run added to leaderboard'
                              : delta?.type === 'insert'
                                ? 'New on this panel'
                                : delta?.type === 'move'
                                  ? `Moved from #${delta.previousRank || '-'}`
                                  : 'Verified run'}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className={`text-sm font-semibold ${highlighted ? 'text-yellow-300' : 'text-zinc-100'}`}>
                            {entry.wpm} WPM
                          </div>
                          <p className="text-[11px] text-zinc-500">{entry.accuracy}% acc</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
