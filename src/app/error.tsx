'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled route error', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-400">
            An unexpected error occurred. Try again, or head back home.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-100 transition-smooth hover:bg-zinc-800/60"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
