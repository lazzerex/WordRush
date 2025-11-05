'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLeaderboardPaginated, subscribeToLeaderboard, getUserRank } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { User } from '@supabase/supabase-js';
import Navigation from '@/components/Navigation';
import { Medal, Award, RefreshCcw, ArrowRight, Crown } from 'lucide-react';
import AppLink from '@/components/AppLink';

type DurationOption = 15 | 30 | 60 | 120;

export default function LeaderboardClient() {
  const PAGE_SIZE = 10;
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; total: number } | null>(null);
  const [newEntryAnimation, setNewEntryAnimation] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(page);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase]);

  const loadLeaderboard = useCallback(
    async (requestedPage: number = 1) => {
      setLoading(true);
      const safePage = Math.max(1, requestedPage);
      const offset = (safePage - 1) * PAGE_SIZE;

      const { entries, total } = await getLeaderboardPaginated(selectedDuration, PAGE_SIZE, offset);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const normalizedPage = Math.min(safePage, totalPages);

      if (normalizedPage !== safePage) {
        setPage(normalizedPage);
        return;
      }

      setLeaderboard(entries);
      setTotalCount(total);
      setLoading(false);
    },
    [selectedDuration]
  );

  useEffect(() => {
    loadLeaderboard(page);
  }, [loadLeaderboard, page]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const loadUserRank = useCallback(async () => {
    if (!user) {
      setUserRank(null);
      return;
    }

    const rank = await getUserRank(user.id, selectedDuration);
    setUserRank(rank);
  }, [user, selectedDuration]);

  useEffect(() => {
    // Try to subscribe to real-time updates (works only if Realtime is enabled)
    try {
      const unsubscribe = subscribeToLeaderboard(selectedDuration, (newEntry) => {
        setNewEntryAnimation(newEntry.id);
        loadLeaderboard(pageRef.current); // Refresh the leaderboard without losing pagination

        // Remove animation after 3 seconds
        setTimeout(() => {
          setNewEntryAnimation(null);
        }, 3000);
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      // Realtime not enabled - that's okay, leaderboard will work without it
      console.log('Realtime not enabled. Leaderboard will require manual refresh.');
    }
  }, [selectedDuration, loadLeaderboard]);

  useEffect(() => {
    loadUserRank();
  }, [loadUserRank]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12 space-y-10">
        <div className="text-center space-y-3 animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Global Leaderboard
          </div>
          <h1 className="text-4xl font-bold text-zinc-50">Chase the crown</h1>
          <p className="text-sm text-zinc-400">Compete with WordRush typists across every duration.</p>
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
                href="/"
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
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-[0.3em] mb-6">Select duration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[15, 30, 60, 120].map((duration) => (
              <button
                key={duration}
                onClick={() => {
                  setPage(1);
                  setSelectedDuration(duration as DurationOption);
                }}
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

        {/* Leaderboard Table */}
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl overflow-hidden backdrop-blur-sm animate-slideInUp animation-delay-300">
          <div className="flex flex-col gap-4 border-b border-zinc-700/60 bg-zinc-900/40 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Top scores • Showing {showingFrom}-{showingTo} of {totalCount || 0}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-50">{selectedDuration} second test</h2>
              <p className="text-sm text-zinc-500">Best verified runs from the community</p>
            </div>
            <button
              onClick={() => loadLeaderboard(page)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing' : 'Refresh'}
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
                href="/"
                loadingMessage="Loading typing test…"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
              >
                Set a record
                <ArrowRight className="w-4 h-4" />
              </AppLink>
            </div>
          ) : (
            <div className="overflow-x-auto animate-fadeIn">
              <table className="w-full">
                <thead className="bg-zinc-900/40 text-left text-xs uppercase tracking-[0.3em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 w-20">Rank</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4">WPM</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`transition-smooth ${
                        newEntryAnimation === entry.id
                          ? 'bg-green-500/10'
                          : isCurrentUser(entry.user_id)
                          ? 'bg-yellow-500/10'
                          : 'hover:bg-zinc-900/40'
                      }`}
                    >
                      <td className="px-6 py-5 text-lg font-semibold">
                        <div className={`flex items-center gap-3 ${getRankColor(entry.rank || 0)}`}>
                          {getMedalIcon(entry.rank || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-5">
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
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-baseline gap-3">
                          <span className={`text-3xl font-semibold ${getWpmColor(entry.wpm)}`}>
                            {entry.wpm}
                          </span>
                          <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">WPM</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-zinc-100">{entry.accuracy}%</span>
                          {entry.accuracy >= 95 && <span className="text-green-400 text-sm">precise</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-500">
                        {formatDate(entry.created_at)}
                        {newEntryAnimation === entry.id && (
                          <span className="ml-2 text-green-400 font-semibold">new</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-800/60 border border-zinc-700/50 rounded-3xl px-6 py-4 backdrop-blur-sm animate-fadeIn animation-delay-350">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="rounded-2xl border border-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-200">
              {page}
            </div>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-2xl border border-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-4 text-center animate-fadeIn animation-delay-400">
          <AppLink
            href="/"
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
