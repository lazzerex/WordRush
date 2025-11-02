'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Trophy, User as UserIcon, LogIn, UserPlus, LogOut, Keyboard } from 'lucide-react';

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-zinc-800 animate-pulse rounded"></div>
            <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Keyboard className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
            <h1 className="text-xl font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">
              WordRush
            </h1>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard"
              className="px-4 py-2 text-zinc-400 hover:text-yellow-500 transition-colors font-medium flex items-center gap-2 rounded-lg hover:bg-zinc-800/50"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
            
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">
                    {user.user_metadata?.username || user.email?.split('@')[0]}
                  </span>
                </div>
                <Link
                  href="/account"
                  className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-all font-medium flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Account</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800/50"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors font-medium flex items-center gap-2 rounded-lg hover:bg-zinc-800/50"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-yellow-600 text-zinc-900 rounded-lg hover:bg-yellow-500 transition-all font-medium flex items-center gap-2 glow-yellow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
