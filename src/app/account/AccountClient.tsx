'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { getUserStats } from '@/lib/typingResults';
import type { UserStats } from '@/types/database';
import Navigation from '@/components/Navigation';
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
} from 'lucide-react';

interface AccountClientProps {
  user: User;
}

export default function AccountClient({ user }: AccountClientProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    const userStats = await getUserStats();
    setStats(userStats);
    setLoadingStats(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl backdrop-blur-sm p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
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
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/90 text-zinc-900 px-5 py-2.5 font-semibold hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20"
                >
                  <Zap className="w-4 h-4" />
                  Take Test
                </Link>
                <Link
                  href="/results"
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-100 hover:bg-zinc-900 transition"
                >
                  <History className="w-4 h-4" />
                  View Results
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition hover:border-yellow-500/60 hover:bg-zinc-900/70">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                  Username
                </div>
                <p className="mt-2 text-lg font-semibold text-zinc-100">{username}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition hover:border-yellow-500/60 hover:bg-zinc-900/70">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  Email
                </div>
                <p className="mt-2 text-lg font-mono text-zinc-200 break-all">{email}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition hover:border-yellow-500/60 hover:bg-zinc-900/70">
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <CalendarDays className="w-4 h-4 text-zinc-500" />
                  Account ID
                </div>
                <p className="mt-2 text-xs font-mono text-zinc-400 break-all">{user.id}</p>
              </div>
              <div className="group rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5 transition hover:border-yellow-500/60 hover:bg-zinc-900/70">
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

          <section className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl backdrop-blur-sm p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Performance</p>
                <h2 className="mt-2 text-2xl font-bold text-zinc-50">Your Typing Stats</h2>
                <p className="text-zinc-400 mt-1">Lifetime insights from your WordRush sessions</p>
              </div>
              <button
                onClick={loadStats}
                className="self-start inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition"
              >
                Refresh stats
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loadingStats ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <div className="h-12 w-12 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin" />
                <p className="mt-4 text-sm">Crunching numbers...</p>
              </div>
            ) : stats && stats.totalTests > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Total Tests
                      <Activity className="w-4 h-4 text-zinc-600" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-zinc-50">{stats.totalTests}</p>
                    <p className="text-xs text-zinc-500 mt-1">Sessions recorded</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Average WPM
                      <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-yellow-400">{stats.averageWpm}</p>
                    <p className="text-xs text-zinc-500 mt-1">Across all durations</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Average Accuracy
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-green-400">{stats.averageAccuracy}%</p>
                    <p className="text-xs text-zinc-500 mt-1">Precision matters</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-6">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      Personal Best
                      <History className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-purple-400">{stats.highestWpm}</p>
                    <p className="text-xs text-zinc-500 mt-1">Highest recorded WPM</p>
                  </div>
                </div>

                {stats.recentTests.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4">Recent Sessions</h3>
                    <div className="space-y-3">
                      {stats.recentTests.slice(0, 4).map((result) => (
                        <div
                          key={result.id}
                          className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/50 px-5 py-4"
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
                    <Link
                      href="/results"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition"
                    >
                      View full history
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                <Activity className="w-12 h-12 text-zinc-600" />
                <p className="mt-4 text-sm">Start taking tests to unlock your statistics.</p>
                <Link
                  href="/"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-yellow-500/90 text-zinc-900 px-6 py-2.5 font-semibold hover:bg-yellow-400 transition"
                >
                  <Zap className="w-4 h-4" />
                  Take your first test
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
