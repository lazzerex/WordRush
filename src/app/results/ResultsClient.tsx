'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { getUserResults, deleteResult } from '@/lib/typingResults';
import type { TypingResult } from '@/types/database';
import Navigation from '@/components/Navigation';
import { ArrowRight, Trash2 } from 'lucide-react';

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
      light: 'border-blue-400/50 bg-blue-400/10 text-blue-200',
      dark: 'border-zinc-600 bg-zinc-700/40 text-zinc-200',
      sepia: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
      neon: 'border-pink-500/60 bg-pink-500/10 text-pink-200',
      ocean: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200',
    };
    return colors[theme] || 'border-zinc-600 bg-zinc-700/40 text-zinc-200';
  };

  const getWpmColor = (wpm: number) => {
    if (wpm >= 80) return 'text-yellow-400';
    if (wpm >= 60) return 'text-green-400';
    if (wpm >= 40) return 'text-blue-400';
    return 'text-zinc-400';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'text-green-400';
    if (accuracy >= 85) return 'text-blue-400';
    if (accuracy >= 75) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="rounded-3xl border border-zinc-700/50 bg-zinc-800/60 p-6 md:p-10 backdrop-blur-sm shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">History</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-50">Test results</h1>
              <p className="mt-2 text-sm text-zinc-400">Review your recent sessions and track progress.</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-yellow-400"
            >
              Start new test
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <div className="h-12 w-12 rounded-full border-2 border-zinc-700 border-t-yellow-500 animate-spin" />
              <p className="mt-4 text-sm">Loading results…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <p className="text-sm">No results yet.</p>
              <p className="mt-1 text-xs text-zinc-500">Run a test to populate your history.</p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-yellow-400"
              >
                Take your first test
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-700/60 bg-zinc-900/40 text-xs uppercase tracking-[0.3em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">WPM</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Theme</th>
                    <th className="px-6 py-4">Characters</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {results.map((result) => (
                    <tr key={result.id} className="transition-colors hover:bg-zinc-900/40">
                      <td className="px-6 py-5 text-sm text-zinc-400">
                        {formatDate(result.created_at)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-2xl font-semibold ${getWpmColor(result.wpm)}`}>
                          {result.wpm}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-lg font-semibold ${getAccuracyColor(result.accuracy)}`}>
                          {result.accuracy}%
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-300">
                        {result.duration}s
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${getThemeColor(
                            result.theme
                          )}`}
                        >
                          {result.theme}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-400">
                        <div className="flex items-center gap-4">
                          <div className="text-green-400 text-xs uppercase tracking-[0.2em]">
                            ✓ {result.correct_chars}
                          </div>
                          <div className="text-red-400 text-xs uppercase tracking-[0.2em]">
                            ✗ {result.incorrect_chars}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm">
                        <button
                          onClick={() => handleDelete(result.id)}
                          disabled={deleting === result.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deleting === result.id ? 'Deleting…' : 'Delete'}
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
            <div className="mt-10 border-t border-zinc-700/60 pt-8">
              <h3 className="text-lg font-semibold text-zinc-200 mb-5">Summary</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Total tests</p>
                  <p className="mt-3 text-2xl font-semibold text-zinc-100">{results.length}</p>
                </div>
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Highest wpm</p>
                  <p className="mt-3 text-2xl font-semibold text-yellow-400">
                    {Math.max(...results.map((r) => r.wpm))}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Best accuracy</p>
                  <p className="mt-3 text-2xl font-semibold text-green-400">
                    {Math.max(...results.map((r) => r.accuracy))}%
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Total characters</p>
                  <p className="mt-3 text-2xl font-semibold text-zinc-100">
                    {results.reduce((sum, r) => sum + r.correct_chars + r.incorrect_chars, 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
