'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AppLink from '@/components/AppLink';
import type { User } from '@supabase/supabase-js';
import { getUserStats } from '@/lib/typingResults';
import type { UserStats } from '@/types/database';
import Navigation from '@/components/Navigation';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import {
  User as UserIcon,
  Mail,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Activity,
  Zap,
  Target,
  History,
  ArrowRight,
  Trophy,
  Swords,
} from 'lucide-react';

interface AccountClientProps {
  user: User;
}

export default function AccountClient({ user }: AccountClientProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadStats();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('elo_rating, wins, losses, draws, matches_played, last_ranked_at')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    const userStats = await getUserStats();
    setStats(userStats);
    setLoadingStats(false);
  };

  const handleSignOut = async () => {
    // This function will be called after the user confirms sign-out in the toast
    setLoading(true);
    try {
      await supabase.auth.signOut();

      // Do NOT reload. Rely on the global auth listener (e.g. in Navigation) to update UI.
      // Show a small success toast (brief) and stop loading.
      setShowConfirm(false);
      setShowToast({ message: 'Signed out', type: 'success' });
      setTimeout(() => setShowToast(null), 2500);
    } catch (err) {
      console.error('Error signing out:', err);
      setShowToast({ message: 'Sign out failed', type: 'error' });
      setTimeout(() => setShowToast(null), 3000);
      setLoading(false);
    }
  };

  // Local state for confirmation toast
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const matchesPlayed = profile?.matches_played ?? 0;
  const hasRankedMatches = matchesPlayed > 0;
  const rankedWins = profile?.wins ?? 0;
  const rankedLosses = profile?.losses ?? 0;
  const rankedDraws = profile?.draws ?? 0;
  const winRate = hasRankedMatches ? Math.round((rankedWins / matchesPlayed) * 100) : null;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl backdrop-blur-sm p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] animate-slideInUp">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-3xl font-semibold text-zinc-900 shadow-lg">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Profile</p>
                  <h1 className="text-3xl font-bold text-zinc-50 mt-1">{username}</h1>
                  <p className="text-zinc-400 text-sm mt-1">Member since {createdAt}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:ml-auto">
                <AppLink
                  href="/?mode=singleplayer"
                  loadingMessage="Loading typing test…"
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/90 text-zinc-900 px-5 py-2.5 font-semibold hover:bg-yellow-400 transition-smooth shadow-lg shadow-yellow-500/20 hover:scale-105"
                >
                  <Zap className="w-4 h-4" />
                  Take Test
                </AppLink>
                <AppLink
                  href="/results"
                  loadingMessage="Fetching your results…"
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-100 hover:bg-zinc-900 transition-smooth hover:scale-105"
                >
                  <History className="w-4 h-4" />
                  View Results
                </AppLink>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-300 hover:bg-zinc-700 transition-smooth disabled:opacity-50 hover:scale-105"
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition-smooth hover:border-yellow-500/60 hover:bg-zinc-900/70 hover:scale-105">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                  Username
                </div>
                <p className="mt-2 text-lg font-semibold text-zinc-100">{username}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition-smooth hover:border-yellow-500/60 hover:bg-zinc-900/70 hover:scale-105">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  Email
                </div>
                <p className="mt-2 text-lg font-mono text-zinc-200 break-all">{email}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition-smooth hover:border-yellow-500/60 hover:bg-zinc-900/70 hover:scale-105">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <CalendarDays className="w-4 h-4 text-zinc-500" />
                  Account ID
                </div>
                <p className="mt-2 text-xs font-mono text-zinc-400 break-all">{user.id}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition-smooth hover:border-yellow-500/60 hover:bg-zinc-900/70 hover:scale-105">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  {user.email_confirmed_at ? (
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-yellow-400" />
                  )}
                  Email Status
                </div>
                <p className={`mt-2 text-lg font-semibold ${user.email_confirmed_at ? 'text-green-400' : 'text-yellow-300'}`}>
                  {user.email_confirmed_at ? 'Verified' : 'Not Verified'}
                </p>
              </div>
            </div>
          </section>

          {/* Confirmation toast (simple) */}
          {showConfirm && (
            <div className="fixed right-6 bottom-6 z-50 w-[320px] rounded-xl bg-zinc-900/95 border border-zinc-700/60 p-4 shadow-lg animate-scaleIn">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-100">Confirm sign out</p>
                  <p className="text-xs text-zinc-400 mt-1">Are you sure you want to sign out?</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-smooth"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignOut}
                    disabled={loading}
                    className="px-3 py-1 rounded-md bg-yellow-500 text-zinc-900 text-sm font-semibold hover:bg-yellow-400 transition-smooth disabled:opacity-60"
                  >
                    {loading ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Small ephemeral toast */}
          {showToast && (
            <div className="fixed right-6 bottom-6 z-50 w-[220px] rounded-lg p-3 shadow-lg animate-scaleIn"
                 style={{ background: showToast.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-sm font-medium text-zinc-100">{showToast.message}</div>
            </div>
          )}

          <section className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl backdrop-blur-sm p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] animate-slideInUp animation-delay-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Performance</p>
                <h2 className="mt-2 text-2xl font-bold text-zinc-50">Your Typing Stats</h2>
                <p className="text-zinc-400 mt-1">Lifetime insights from your WordRush sessions</p>
              </div>
              <button
                onClick={loadStats}
                className="self-start inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-smooth"
              >
                Refresh stats
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loadingStats ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 animate-fadeIn">
                <div className="h-12 w-12 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin" />
                <p className="mt-4 text-sm">Crunching numbers...</p>
              </div>
            ) : stats && stats.totalTests > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6 transition-smooth hover:scale-105 animate-slideInUp">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Total Tests
                      <Activity className="w-4 h-4 text-zinc-600" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-zinc-50">{stats.totalTests}</p>
                    <p className="text-xs text-zinc-500 mt-1">Sessions recorded</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-6 transition-smooth hover:scale-105 animate-slideInUp animation-delay-50">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      ELO Rating
                      <Trophy className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-purple-400">{profile?.elo_rating ?? 1000}</p>
                    <p className="text-xs text-zinc-500 mt-1">Ranked multiplayer</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6 transition-smooth hover:scale-105 animate-slideInUp animation-delay-100">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Average WPM
                      <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-yellow-400">{stats.averageWpm}</p>
                    <p className="text-xs text-zinc-500 mt-1">Across all durations</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6 transition-smooth hover:scale-105 animate-slideInUp animation-delay-200">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Average Accuracy
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-green-400">{stats.averageAccuracy}%</p>
                    <p className="text-xs text-zinc-500 mt-1">Precision matters</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6 transition-smooth hover:scale-105 animate-slideInUp animation-delay-300">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Personal Best
                      <History className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-purple-400">{stats.highestWpm}</p>
                    <p className="text-xs text-zinc-500 mt-1">Highest recorded WPM</p>
                  </div>
                </div>

                {/* Activity Heatmap */}
                <div className="mt-10 animate-fadeIn animation-delay-400">
                  <h3 className="text-lg font-semibold text-zinc-200 mb-6">Activity Overview</h3>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6">
                    <ActivityHeatmap results={stats.allResults} />
                  </div>
                </div>

                {/* Performance Breakdown by Duration */}
                <div className="mt-10 animate-fadeIn animation-delay-500">
                  <h3 className="text-lg font-semibold text-zinc-200 mb-4">Performance by Duration</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[15, 30, 60, 120].map((duration) => {
                      const testsForDuration = stats.allResults.filter((r) => r.duration === duration);
                      const avgWpm = testsForDuration.length > 0
                        ? Math.round(testsForDuration.reduce((sum, r) => sum + r.wpm, 0) / testsForDuration.length)
                        : 0;
                      const avgAccuracy = testsForDuration.length > 0
                        ? Math.round(testsForDuration.reduce((sum, r) => sum + r.accuracy, 0) / testsForDuration.length)
                        : 0;
                      
                      return (
                        <div key={duration} className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5">
                          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
                            {duration} seconds
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-zinc-500">Tests</div>
                              <div className="text-2xl font-semibold text-zinc-100">{testsForDuration.length}</div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500">Avg WPM</div>
                              <div className="text-xl font-semibold text-yellow-400">{avgWpm}</div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500">Avg Accuracy</div>
                              <div className="text-lg font-semibold text-green-400">{avgAccuracy}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {stats.recentTests.length > 0 && (
                  <div className="mt-10 animate-fadeIn animation-delay-600">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4">Recent Sessions</h3>
                    <div className="space-y-3">
                      {stats.recentTests.slice(0, 4).map((result) => (
                        <div
                          key={result.id}
                          className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/50 px-5 py-4 transition-smooth hover:scale-[1.02]"
                        >
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">WPM</p>
                            <p className="text-2xl font-semibold text-yellow-400">{result.wpm}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Accuracy</p>
                            <p className="text-lg font-medium text-green-400">{result.accuracy}%</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Session</p>
                            <p className="text-sm text-zinc-300">{result.duration}s • {result.theme}</p>
                          </div>
                          <div className="text-sm text-zinc-500 justify-self-end">
                            {new Date(result.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <AppLink
                      href="/results"
                      loadingMessage="Opening full history…"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-smooth"
                    >
                      View full history
                      <ArrowRight className="w-4 h-4" />
                    </AppLink>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 animate-fadeIn">
                <Activity className="w-12 h-12 text-zinc-600" />
                <p className="mt-4 text-sm">Start taking tests to unlock your statistics.</p>
                <AppLink
                  href="/?mode=singleplayer"
                  loadingMessage="Loading typing test…"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-yellow-500/90 text-zinc-900 px-6 py-2.5 font-semibold hover:bg-yellow-400 transition-smooth hover:scale-105"
                >
                  <Zap className="w-4 h-4" />
                  Take your first test
                </AppLink>
              </div>
            )}
          </section>

          {/* Multiplayer Stats Section */}
          {profile && (
            <section className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl backdrop-blur-sm p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] animate-slideInUp animation-delay-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                  <Swords className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Multiplayer</p>
                  <h2 className="text-2xl font-bold text-zinc-50">Ranked Stats</h2>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 transition-smooth hover:scale-105">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    ELO Rating
                    <Trophy className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="mt-3 text-4xl font-bold text-purple-400">{profile.elo_rating ?? 1000}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(profile.elo_rating ?? 1000) >= 1500 ? 'Expert' : 
                     (profile.elo_rating ?? 1000) >= 1200 ? 'Advanced' : 
                     (profile.elo_rating ?? 1000) >= 900 ? 'Intermediate' : 'Beginner'}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6 transition-smooth hover:scale-105">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    Matches Played
                    <Swords className="w-4 h-4 text-zinc-600" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-zinc-50">{matchesPlayed}</p>
                  <p className="text-xs text-zinc-500 mt-1">{hasRankedMatches ? 'Total duels' : 'Play your first ranked match'}</p>
                </div>

                <div className="rounded-2xl border border-green-500/20 bg-green-900/10 p-6 transition-smooth hover:scale-105">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    Wins
                    <Trophy className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-green-400">{rankedWins}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {hasRankedMatches ? `${winRate}% win rate` : 'No matches yet'}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-900/10 p-6 transition-smooth hover:scale-105">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    Losses
                    <Target className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-red-400">{rankedLosses}</p>
                  <p className="text-xs text-zinc-500 mt-1">Keep improving</p>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-900/10 p-6 transition-smooth hover:scale-105">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    Draws
                    <Activity className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-yellow-400">{rankedDraws}</p>
                  <p className="text-xs text-zinc-500 mt-1">Close matches</p>
                </div>
              </div>

              {profile.last_ranked_at && (
                <div className="mt-6 text-xs text-zinc-500">
                  Last ranked match: {new Date(profile.last_ranked_at).toLocaleString()}
                </div>
              )}

              {!hasRankedMatches && (
                <p className="mt-6 text-sm text-zinc-400">
                  Jump into a ranked match to begin tracking your competitive progress.
                </p>
              )}

              <AppLink
                href="/multiplayer"
                loadingMessage="Loading multiplayer…"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-500/90 text-white px-5 py-2.5 font-semibold hover:bg-purple-400 transition-smooth shadow-lg shadow-purple-500/20"
              >
                <Swords className="w-4 h-4" />
                Play Ranked Match
              </AppLink>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
