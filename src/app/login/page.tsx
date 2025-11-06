'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import AppLink from '@/components/AppLink';
import { LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { broadcastLoadingEvent } from '@/lib/ui-events';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  setError(null);
  setOauthLoading(false);
    let triggeredGlobalLoading = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      broadcastLoadingEvent({ active: true, message: 'Loading your account…' });
      triggeredGlobalLoading = true;
      router.push('/account');
      router.refresh();
    } catch (error: any) {
      if (triggeredGlobalLoading) {
        broadcastLoadingEvent({ active: false });
      }
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
      if (!triggeredGlobalLoading) {
        broadcastLoadingEvent({ active: false });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setOauthLoading(true);
      broadcastLoadingEvent({ active: true, message: 'Signing in with Google…' });

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=/account`
            : undefined,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      setError(error?.message || 'Unable to continue with Google');
      setOauthLoading(false);
      broadcastLoadingEvent({ active: false });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
      <Navigation />
      <div className="pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-zinc-700/60 bg-zinc-800/60 p-10 backdrop-blur-md shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-scaleIn">
            <div className="text-center mb-10 animate-fadeIn">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/90 text-zinc-900">
                <LogIn className="w-5 h-5" />
              </div>
              <h1 className="mt-6 text-3xl font-bold text-zinc-50">Welcome back</h1>
              <p className="mt-2 text-sm text-zinc-400">Sign in to continue your typing journey</p>
            </div>

            <div className="space-y-4 animate-fadeIn">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-100 transition-smooth hover:bg-zinc-800/60 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-900">G</span>
                {oauthLoading ? 'Connecting…' : 'Continue with Google'}
              </button>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-600">
                <span className="h-px w-full bg-zinc-700/60" />
                <span>or</span>
                <span className="h-px w-full bg-zinc-700/60" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 animate-slideInUp animation-delay-100">
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth"
                    placeholder="••••••••"
                    aria-describedby="password-toggle"
                  />
                  <button
                    id="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-2 flex items-center p-1 text-zinc-400 hover:text-zinc-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full rounded-2xl bg-yellow-500/90 px-4 py-3 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-zinc-400 animate-fadeIn animation-delay-200">
              <p>
                Don't have an account?{' '}
                <AppLink
                  href="/register"
                  loadingMessage="Preparing signup…"
                  className="font-semibold text-zinc-100 hover:text-yellow-400 transition-smooth"
                >
                  Create one
                </AppLink>
              </p>
            </div>

            <div className="mt-6 text-center animate-fadeIn animation-delay-300">
              <AppLink
                href="/"
                loadingMessage="Loading typing test…"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-smooth"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to typing test
              </AppLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
