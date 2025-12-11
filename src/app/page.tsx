"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';

import ClickSpark from '@/components/ClickSpark';
import { createClient } from '@/lib/supabase/client';

// Use dynamic import to avoid hydration issues for the typing test
const TypingTest = dynamic(() => import('@/components/TypingTest'), { ssr: false });

type MenuState = 'open' | 'opening' | 'closing' | 'closed';

function HomeContent() {
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('mode') === 'singleplayer';
  const [menuState, setMenuState] = useState<MenuState>(autoStart ? 'closed' : 'open');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) setIsAuthenticated(!!user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setIsAuthenticated(!!session?.user);
    });

    return () => {
      isMounted = false;
      data.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const handleSingleplayer = () => {
    if (menuState !== 'open') return;
    setMenuState('closing');
    window.setTimeout(() => setMenuState('closed'), 480);
  };

  const handleMultiplayer = () => {
    if (menuState !== 'open') return;
    setMenuState('closing');
    window.setTimeout(() => (window.location.href = '/multiplayer'), 480);
  };

  const handleOpenMenu = () => {
    if (menuState === 'closed') {
      setMenuState('opening');
      window.setTimeout(() => setMenuState('open'), 50);
    }
  };

  const overlayVisible = menuState !== 'closed';

  return (
    <div className="relative min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <div className={`relative z-10 min-h-screen transition-all duration-500 ease-out ${overlayVisible ? 'pointer-events-none select-none opacity-90 blur-[6px]' : 'opacity-100 blur-0'}`}> 
        <Navigation />
        <main className="pt-20 pb-12 px-4">
          <TypingTest onOpenMenu={handleOpenMenu} />
        </main>
      </div>

      {overlayVisible && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-900/70 backdrop-blur-sm px-6">
          {/* Menu content */}
          <div
            className={`relative z-10 flex flex-col items-center gap-8 text-center text-white transition-all duration-500 ease-out ${menuState === 'closing' ? '-translate-y-20 opacity-0' : menuState === 'opening' ? 'translate-y-12 opacity-0' : 'translate-y-0 opacity-100'}`}
          >
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-400 mb-2 animate-fade-in">Welcome to</p>
              <h1 className="text-6xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">WordRush</h1>
              <div className="h-1 w-20 bg-gradient-to-r from-yellow-500 to-blue-500 rounded-full mx-auto" />
            </div>
            <div className="flex flex-col items-center gap-4">
              <button 
                type="button" 
                onClick={handleSingleplayer} 
                className="text-4xl font-semibold tracking-wide text-white transition-all duration-200 hover:text-yellow-400 hover:scale-105 drop-shadow-md"
              >
                Singleplayer
              </button>
              <button 
                type="button" 
                onClick={handleMultiplayer} 
                className="text-4xl font-semibold tracking-wide text-white transition-all duration-200 hover:text-yellow-400 hover:scale-105 drop-shadow-md"
              >
                Multiplayer
              </button>
              {!isAuthenticated && (
                <div className="mt-6 text-base text-white/70">
                  New here?{' '}
                  <Link href="/register?returnTo=/" className="underline decoration-yellow-500/40 underline-offset-4 transition-all hover:decoration-yellow-500 hover:text-yellow-400">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
          <Navigation />
          <main className="pt-20 pb-12 px-4">
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-zinc-400">Loading...</div>
            </div>
          </main>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}