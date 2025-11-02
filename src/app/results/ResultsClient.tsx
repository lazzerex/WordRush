'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { getUserResults, deleteResult } from '@/lib/typingResults';
import type { TypingResult } from '@/types/database';

interface ResultsClientProps {
  user: User;
}

export default function ResultsClient({ user }: ResultsClientProps) {
  const [results, setResults] = useState<TypingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    const userResults = await getUserResults(100); // Get last 100 results
    setResults(userResults);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDelete = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    setDeleting(resultId);
    const success = await deleteResult(resultId);
    
    if (success) {
      setResults(results.filter((r) => r.id !== resultId));
    } else {
      alert('Failed to delete result');
    }
    
    setDeleting(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getThemeColor = (theme: string) => {
    const colors: { [key: string]: string } = {
      light: 'bg-blue-100 text-blue-800',
      dark: 'bg-gray-700 text-gray-100',
      sepia: 'bg-amber-100 text-amber-800',
      neon: 'bg-pink-100 text-pink-800',
      ocean: 'bg-cyan-100 text-cyan-800',
    };
    return colors[theme] || 'bg-gray-100 text-gray-800';
  };

  const getWpmColor = (wpm: number) => {
    if (wpm >= 80) return 'text-green-600';
    if (wpm >= 60) return 'text-blue-600';
    if (wpm >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'text-green-600';
    if (accuracy >= 85) return 'text-blue-600';
    if (accuracy >= 75) return 'text-yellow-600';
    return 'text-red-600';
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
            <Link
              href="/account"
              className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition font-medium"
            >
              Account
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test History</h1>
              <p className="text-gray-600 mt-2">View all your typing test results</p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              New Test
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-24 h-24 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No results yet</h3>
              <p className="text-gray-600 mb-6">
                Take your first typing test to see your results here!
              </p>
              <Link
                href="/"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Start Typing Test
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WPM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Theme
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Characters
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(result.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-2xl font-bold ${getWpmColor(result.wpm)}`}>
                          {result.wpm}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-lg font-semibold ${getAccuracyColor(result.accuracy)}`}>
                          {result.accuracy}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.duration}s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getThemeColor(
                            result.theme
                          )}`}
                        >
                          {result.theme}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col">
                          <span className="text-green-600">✓ {result.correct_chars}</span>
                          <span className="text-red-600">✗ {result.incorrect_chars}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(result.id)}
                          disabled={deleting === result.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
                        >
                          {deleting === result.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {results.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Tests</div>
                  <div className="text-2xl font-bold text-blue-600">{results.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Highest WPM</div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.max(...results.map((r) => r.wpm))}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Best Accuracy</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.max(...results.map((r) => r.accuracy))}%
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Characters</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.reduce((sum, r) => sum + r.correct_chars + r.incorrect_chars, 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
