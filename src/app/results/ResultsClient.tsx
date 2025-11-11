'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getUserResultsPaginated, deleteResult } from '@/lib/typingResults';
import type { TypingResult } from '@/types/database';
import Navigation from '@/components/Navigation';
import AppLink from '@/components/AppLink';
import { ArrowRight, Trash2, Check, X } from 'lucide-react';

interface ResultsClientProps {
  user: User;
}

export default function ResultsClient({ user }: ResultsClientProps) {
  const PAGE_SIZE = 10;
  const [results, setResults] = useState<TypingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadResults(page);
  }, [page]);

  const loadResults = async (requestedPage: number = 1) => {
    setLoading(true);
    const safePage = Math.max(1, requestedPage);
    const offset = (safePage - 1) * PAGE_SIZE;

    const { results: pageResults, total } = await getUserResultsPaginated(PAGE_SIZE, offset);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const normalizedPage = Math.min(safePage, totalPages);

    if (normalizedPage !== safePage) {
      setPage(normalizedPage);
      return;
    }

    setResults(pageResults);
    setTotalCount(total);
    setLoading(false);
  };

  const handleDelete = async (resultId: string) => {
    setDeleting(resultId);
    const success = await deleteResult(resultId);
    
    if (success) {
      await loadResults(page);
    } else {
      alert('Failed to delete result');
    }
    
    setDeleting(null);
    setConfirmDelete(null);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="rounded-3xl border border-zinc-700/50 bg-zinc-800/60 p-6 md:p-10 backdrop-blur-sm shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-slideInUp">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8 animate-fadeIn">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">History</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-50">Test results</h1>
              <p className="mt-2 text-sm text-zinc-400">Review your recent sessions and track progress.</p>
            </div>
            <AppLink
              href="/?mode=singleplayer"
              loadingMessage="Preparing a fresh test…"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
            >
              Start new test
              <ArrowRight className="w-4 h-4" />
            </AppLink>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 animate-fadeIn">
              <div className="h-12 w-12 rounded-full border-2 border-zinc-700 border-t-yellow-500 animate-spin" />
              <p className="mt-4 text-sm">Loading results…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 animate-fadeIn">
              <p className="text-sm">No results yet.</p>
              <p className="mt-1 text-xs text-zinc-500">Run a test to populate your history.</p>
              <AppLink
                href="/?mode=singleplayer"
                loadingMessage="Setting up your first run…"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-yellow-500/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105"
              >
                Take your first test
                <ArrowRight className="w-4 h-4" />
              </AppLink>
            </div>
          ) : (
            <div className="overflow-x-auto animate-fadeIn">
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
                    <tr key={result.id} className="transition-smooth hover:bg-zinc-900/40">
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
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green-300">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {result.correct_chars}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-red-300">
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            {result.incorrect_chars}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm">
                        <button
                          onClick={() => setConfirmDelete(result.id)}
                          disabled={deleting === result.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-300 transition-smooth hover:bg-red-500/10 hover:scale-105 disabled:opacity-40"
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

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-700/60 rounded-2xl px-5 py-3 animate-fadeIn">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Showing {showingFrom}-{showingTo} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-xl border border-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-200">
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-xl border border-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-smooth hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {results.length > 0 && (
            <div className="mt-10 border-t border-zinc-700/60 pt-8 animate-fadeIn animation-delay-100">
              <h3 className="text-lg font-semibold text-zinc-200 mb-5">Page Summary</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-5 transition-smooth hover:scale-105">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Total on page</p>
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

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700/60 p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full bg-red-500/10 p-3">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-100">Delete Result</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Are you sure you want to delete this test result? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
                className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-smooth disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting !== null}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-smooth disabled:opacity-50 flex items-center gap-2"
              >
                {deleting === confirmDelete ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
