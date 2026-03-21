/**
 * TestResults Component
 * Displays test completion screen with stats and actions
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Coins, EyeOff, Eye, Trophy, ChevronRight } from 'lucide-react';
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
  const PREVIEW_SIZE = 6;
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [previewEntries, setPreviewEntries] = useState<LeaderboardEntry[]>([]);
  const [visibleRows, setVisibleRows] = useState(0);

  const loadMiniLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);

    try {
      const response = await fetch(`/api/leaderboard?duration=${duration}&page=1&pageSize=${PREVIEW_SIZE}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setPreviewEntries([]);
        return;
      }

      const fetchedEntries: LeaderboardEntry[] = payload.data.entries || [];
      const currentEntryPresent = !!latestResultId && fetchedEntries.some((entry) => entry.id === latestResultId);

      // Keep the preview concise while ensuring the latest result can be highlighted.
      if (!currentEntryPresent && latestResultId) {
        let rank: number | undefined;

        if (latestResultUserId) {
          const userRank = await getUserRank(latestResultUserId, duration);
          rank = userRank?.rank;
        }

        const topRows = fetchedEntries.slice(0, Math.max(0, PREVIEW_SIZE - 1));
        const syntheticCurrentEntry: LeaderboardEntry = {
          id: latestResultId,
          user_id: latestResultUserId || 'current-user',
          username: 'You',
          email: '',
          wpm,
          accuracy,
          created_at: latestResultCreatedAt || new Date().toISOString(),
          rank,
        };

        setPreviewEntries([...topRows, syntheticCurrentEntry]);
      } else {
        setPreviewEntries(fetchedEntries.slice(0, PREVIEW_SIZE));
      }
    } catch (error) {
      console.error('Failed to load mini leaderboard:', error);
      setPreviewEntries([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [duration, latestResultCreatedAt, latestResultId, latestResultUserId, wpm, accuracy]);

  useEffect(() => {
    loadMiniLeaderboard();
  }, [loadMiniLeaderboard]);

  useEffect(() => {
    if (!showLeaderboard) {
      return;
    }

    // Recheck shortly after opening so freshly inserted results are reflected,
    // then keep a lightweight live refresh cadence while panel is visible.
    const warmupTimer = setTimeout(() => {
      loadMiniLeaderboard();
    }, 1200);

    const interval = setInterval(() => {
      loadMiniLeaderboard();
    }, 5000);

    return () => {
      clearTimeout(warmupTimer);
      clearInterval(interval);
    };
  }, [showLeaderboard, loadMiniLeaderboard]);

  useEffect(() => {
    if (loadingLeaderboard || previewEntries.length === 0) {
      setVisibleRows(0);
      return;
    }

    let row = 0;
    setVisibleRows(0);

    const timer = setInterval(() => {
      row += 1;
      setVisibleRows(row);

      if (row >= previewEntries.length) {
        clearInterval(timer);
      }
    }, 90);

    return () => clearInterval(timer);
  }, [loadingLeaderboard, previewEntries]);

  const rowsToRender = useMemo(() => previewEntries.slice(0, visibleRows), [previewEntries, visibleRows]);

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
          >
            {showLeaderboard ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
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
                    Top {PREVIEW_SIZE} for {duration}s
                  </h3>
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

              <div className="space-y-2">
                {loadingLeaderboard ? (
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

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-smooth ${
                          highlighted
                            ? 'border-yellow-500/60 bg-yellow-500/10 animate-scaleIn shadow-[0_0_0_1px_rgba(234,179,8,0.2)]'
                            : 'border-zinc-800 bg-zinc-900/40'
                        }`}
                        style={{ transitionDelay: `${index * 60}ms` }}
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
                            {highlighted ? 'Latest run added to leaderboard' : 'Verified run'}
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
