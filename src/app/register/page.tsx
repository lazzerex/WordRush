'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import AppLink from '@/components/AppLink';
import { UserPlus, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { broadcastLoadingEvent } from '@/lib/ui-events';
import { useSupabase } from '@/components/SupabaseProvider';

function RegisterPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/account';
  const { supabase } = useSupabase();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOauthLoading(false);
    setError(null);
    let registrationSucceeded = false;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase not ready');
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });

      if (signUpError) throw signUpError;

      registrationSucceeded = true;
      setSuccess(true);
      broadcastLoadingEvent({ active: true, message: 'Preparing your profile…' });
      router.push(returnTo);
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
      broadcastLoadingEvent({ active: false });
    } finally {
      setLoading(false);
      if (!registrationSucceeded) {
        broadcastLoadingEvent({ active: false });
      }
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError(null);
      setOauthLoading(true);
      broadcastLoadingEvent({ active: true, message: 'Connecting to Google…' });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      if (!supabase) throw new Error('Supabase not ready');
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(returnTo)}`,
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

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
        <Navigation />
        <div className="pt-32 pb-16 px-4 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="rounded-3xl border border-green-500/30 bg-zinc-800/60 p-10 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-scaleIn">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400 animate-pulse-smooth">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-zinc-50">Registration successful!</h2>
              <p className="mt-2 text-sm text-zinc-400">Redirecting you to your profile…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
      <Navigation />
      <div className="pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-zinc-700/60 bg-zinc-800/60 p-10 backdrop-blur-md shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-scaleIn">
            <div className="text-center mb-10 animate-fadeIn">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/90 text-zinc-900">
                <UserPlus className="w-5 h-5" />
              </div>
              <h1 className="mt-6 text-3xl font-bold text-zinc-50">Create your account</h1>
              <p className="mt-2 text-sm text-zinc-400">Save your progress and compete with the leaderboard.</p>
            </div>

            <div className="space-y-4 animate-fadeIn">
              <button
                type="button"
                onClick={handleGoogleSignUp}
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

            <form onSubmit={handleRegister} className="space-y-5 animate-slideInUp animation-delay-100">
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-zinc-300">
                  Username (optional)
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth"
                  placeholder="cooluser123"
                />
              </div>

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
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    placeholder="••••••••"
                    aria-describedby="register-password-toggle"
                    style={{ backgroundImage: 'none' }}
                  />
                  <button
                    id="register-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    placeholder="••••••••"
                    aria-describedby="register-confirm-password-toggle"
                    style={{ backgroundImage: 'none' }}
                  />
                  <button
                    id="register-confirm-password-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full rounded-2xl bg-yellow-500/90 px-4 py-3 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-zinc-400 animate-fadeIn animation-delay-200">
              <p>
                Already have an account?{' '}
                <AppLink
                  href="/login"
                  loadingMessage="Loading login…"
                  className="font-semibold text-zinc-100 hover:text-yellow-400 transition-smooth"
                >
                  Sign in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
          <Navigation />
          <div className="pt-24 pb-16 px-4 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <div className="rounded-3xl border border-zinc-700/60 bg-zinc-800/60 p-10 text-center">
                <p className="text-sm text-zinc-400">Loading sign up…</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
