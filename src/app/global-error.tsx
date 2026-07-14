'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled root layout error', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center space-y-6">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-sm text-zinc-400">
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-400"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
