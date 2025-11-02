'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getLeaderboard, subscribeToLeaderboard, getUserRank } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { User } from '@supabase/supabase-js';

type DurationOption = 15 | 30 | 60 | 120;

export default function LeaderboardClient() {
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; total: number } | null>(null);
  const [newEntryAnimation, setNewEntryAnimation] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    loadLeaderboard();
    
    // Try to subscribe to real-time updates (works only if Realtime is enabled)
    try {
      const unsubscribe = subscribeToLeaderboard(selectedDuration, (newEntry) => {
        setNewEntryAnimation(newEntry.id);
        loadLeaderboard(); // Refresh the leaderboard
        
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
  }, [selectedDuration]);

  useEffect(() => {
    // Load user rank if logged in
    if (user) {
      loadUserRank();
    }
  }, [user, selectedDuration, leaderboard]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await getLeaderboard(selectedDuration, 100);
    setLeaderboard(data);
    setLoading(false);
  };

  const loadUserRank = async () => {
    if (!user) return;
    const rank = await getUserRank(user.id, selectedDuration);
    setUserRank(rank);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-700';
  };

  const getWpmColor = (wpm: number) => {
    if (wpm >= 100) return 'text-purple-600';
    if (wpm >= 80) return 'text-green-600';
    if (wpm >= 60) return 'text-blue-600';
    if (wpm >= 40) return 'text-yellow-600';
    return 'text-gray-600';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition">
            WordRush
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Account
                </Link>
                <Link
                  href="/results"
                  className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  My Results
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏆 Global Leaderboard</h1>
          <p className="text-gray-600">Compete with typists from around the world</p>
        </div>

        {/* User Rank Card (if logged in) */}
        {user && userRank && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Your Rank</h3>
                <p className="text-3xl font-bold">#{userRank.rank}</p>
                <p className="text-indigo-100">out of {userRank.total} players</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-indigo-100 mb-1">Duration: {selectedDuration}s</p>
                <Link
                  href="/"
                  className="inline-block bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition"
                >
                  Improve Rank
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Duration Selector */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Duration</h3>
          <div className="grid grid-cols-4 gap-4">
            {[15, 30, 60, 120].map((duration) => (
              <button
                key={duration}
                onClick={() => setSelectedDuration(duration as DurationOption)}
                className={`py-3 px-6 rounded-lg font-semibold transition-all ${
                  selectedDuration === duration
                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Top 100 - {selectedDuration} Second Test
              </h2>
              <p className="text-indigo-100 mt-1">
                Showing best scores
              </p>
            </div>
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No scores yet for this duration!</p>
              <p className="text-gray-500 text-sm">Be the first to set a record!</p>
              <Link
                href="/"
                className="inline-block mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Take the Test
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WPM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`transition-all ${
                        newEntryAnimation === entry.id
                          ? 'bg-green-50 animate-pulse'
                          : isCurrentUser(entry.user_id)
                          ? 'bg-indigo-50 font-semibold'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-2xl font-bold ${getRankColor(entry.rank || 0)}`}>
                          {getMedalIcon(entry.rank || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.username}
                              {isCurrentUser(entry.user_id) && (
                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-3xl font-bold ${getWpmColor(entry.wpm)}`}>
                          {entry.wpm}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">WPM</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-gray-900">
                            {entry.accuracy}%
                          </span>
                          {entry.accuracy >= 95 && (
                            <span className="ml-2 text-green-500">✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(entry.created_at)}
                        {newEntryAnimation === entry.id && (
                          <span className="ml-2 text-green-600 font-semibold animate-pulse">
                            NEW!
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
          >
            🚀 Take the Test & Join the Leaderboard!
          </Link>
        </div>
      </main>
    </div>
  );
}
