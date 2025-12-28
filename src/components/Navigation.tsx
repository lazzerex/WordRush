'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Trophy, User as UserIcon, LogIn, UserPlus, LogOut, Keyboard, Coins, Shield } from 'lucide-react';
import { COINS_EVENT, CoinsEventDetail } from '@/lib/ui-events';
import AppLink from '@/components/AppLink';
import OnlinePlayersCounter from '@/components/OnlinePlayersCounter';

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [coins, setCoins] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadUserCoins(user.id);
        checkAdminStatus(user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserCoins(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setCoins(0);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleCoinsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<CoinsEventDetail>).detail;
      if (detail && typeof detail.coins === 'number') {
        setCoins(detail.coins);
      }
    };

    window.addEventListener(COINS_EVENT, handleCoinsUpdate as EventListener);
    return () => {
      window.removeEventListener(COINS_EVENT, handleCoinsUpdate as EventListener);
    };
  }, []);

  const loadUserCoins = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    
    setCoins(data?.coins || 0);
  };

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    setIsAdmin(data?.is_admin || false);
  };

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 wr-elevated wr-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Online Counter */}
          <div className="flex items-center gap-4">
            <AppLink
              href="/"
              loadingMessage="Loading typing test…"
              className="flex items-center gap-2 group"
              onClick={e => {
                // If in singleplayer, trigger menu open event
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('wordrush:openMenu'));
                }
              }}
            >
              <Keyboard className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
              <h1 className="text-xl font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors wr-text-primary">
                WordRush
              </h1>
            </AppLink>
            <OnlinePlayersCounter />
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mr-2 wr-border">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-500">{coins}</span>
              </div>
            )}
            
            <AppLink
              href="/leaderboard"
              loadingMessage="Fetching leaderboard…"
              className="px-4 py-2 text-zinc-400 hover:text-yellow-500 transition-colors font-medium flex items-center gap-2 rounded-lg hover:bg-zinc-800/50 wr-text-secondary"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </AppLink>
            
            {user ? (
              <>
                {isAdmin && (
                  <AppLink
                    href="/admin"
                    loadingMessage="Loading admin dashboard…"
                    className="px-4 py-2 text-yellow-400 hover:text-yellow-300 transition-colors font-medium flex items-center gap-2 rounded-lg hover:bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </AppLink>
                )}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg wr-surface">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400 wr-text-secondary">
                    {user.user_metadata?.username || user.email?.split('@')[0]}
                  </span>
                </div>
                <AppLink
                  href="/account"
                  loadingMessage="Opening account…"
                  className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-all font-medium flex items-center gap-2 wr-surface"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Account</span>
                </AppLink>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800/50 wr-text-secondary"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <AppLink
                  href={`/login${pathname && pathname !== '/login' && pathname !== '/register' ? `?returnTo=${encodeURIComponent(pathname)}` : ''}`}
                  loadingMessage="Loading login…"
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors font-medium flex items-center gap-2 rounded-lg hover:bg-zinc-800/50 wr-text-secondary"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </AppLink>
                <AppLink
                  href={`/register${pathname && pathname !== '/login' && pathname !== '/register' ? `?returnTo=${encodeURIComponent(pathname)}` : ''}`}
                  loadingMessage="Preparing signup…"
                  className="px-4 py-2 bg-yellow-600 text-zinc-900 rounded-lg hover:bg-yellow-500 transition-all font-medium flex items-center gap-2 glow-yellow-sm wr-accent-bg"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Up</span>
                </AppLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
