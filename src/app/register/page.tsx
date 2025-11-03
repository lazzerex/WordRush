'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { UserPlus, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      setSuccess(true);

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        <Navigation />
        <div className="pt-32 pb-16 px-4 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="rounded-3xl border border-green-500/30 bg-zinc-800/60 p-10 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] animate-scaleIn">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400 animate-pulse-smooth">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-zinc-50">Registration successful!</h2>
              <p className="mt-2 text-sm text-zinc-400">Redirecting you to the login screen…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
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
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-0 transition-smooth"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-yellow-500/90 px-4 py-3 text-sm font-semibold text-zinc-900 transition-smooth hover:bg-yellow-400 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-zinc-400 animate-fadeIn animation-delay-200">
              <p>
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-zinc-100 hover:text-yellow-400 transition-smooth">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center animate-fadeIn animation-delay-300">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-smooth">
                <ArrowLeft className="w-4 h-4" />
                Back to typing test
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
