'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';

// Use dynamic import to avoid hydration issues
const TypingTest = dynamic(() => import('../components/TypingTest'), {
  ssr: false,
});

type MenuState = 'open' | 'opening' | 'closing' | 'closed';

export default function Home() {
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('mode') === 'singleplayer';
  const [menuState, setMenuState] = useState<MenuState>(autoStart ? 'closed' : 'open');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) {
        setIsAuthenticated(!!user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session?.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSingleplayer = () => {
    if (menuState !== 'open') {
      return;
    }

    setMenuState('closing');
    window.setTimeout(() => {
      setMenuState('closed');
    }, 480);
  };

  const handleMultiplayer = () => {
    if (menuState !== 'open') {
      return;
    }

    setMenuState('closing');
    window.setTimeout(() => {
      window.location.href = '/multiplayer';
    }, 480);
  };

  const handleOpenMenu = () => {
    if (menuState === 'closed') {
      setMenuState('opening');
      window.setTimeout(() => {
        setMenuState('open');
      }, 50); // Small delay to trigger animation
    }
  };

  const overlayVisible = menuState !== 'closed';

  return (
    <div className="relative min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <div
        className={`relative z-10 min-h-screen transition-all duration-500 ease-out ${overlayVisible ? 'pointer-events-none select-none opacity-90 blur-[6px]' : 'opacity-100 blur-0'}`}
      >
        <Navigation />
        <main className="pt-20 pb-12 px-4">
          <TypingTest onOpenMenu={handleOpenMenu} />
        </main>
      </div>

      {overlayVisible && (
        <div className={`absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-3xl px-6 transition-opacity duration-500 ${menuState === 'opening' ? 'opacity-0' : 'opacity-100'}`}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className={`absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl transition-all duration-1000 ${menuState === 'closing' || menuState === 'opening' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
            />
            <div
              className={`absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl transition-all duration-1000 delay-100 ${menuState === 'closing' || menuState === 'opening' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
            />
            <div
              className={`absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl transition-all duration-1000 delay-200 ${menuState === 'closing' || menuState === 'opening' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
            />
          </div>

          {/* Title section */}
          <div
            className={`relative flex flex-col items-center gap-8 text-center text-white transition-all duration-500 ease-out ${
              menuState === 'closing' 
                ? '-translate-y-20 opacity-0' 
                : menuState === 'opening'
                ? 'translate-y-12 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-400 mb-2 animate-fade-in">
                Welcome to
              </p>
              <h1 className="text-6xl font-bold text-white mb-3 tracking-tight">
                WordRush
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-yellow-500 to-blue-500 rounded-full mx-auto" />
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleSingleplayer}
                className="text-4xl font-semibold tracking-wide text-white transition-all duration-200 hover:text-yellow-400 hover:scale-105"
              >
                Singleplayer
              </button>
              <button
                type="button"
                onClick={handleMultiplayer}
                className="text-4xl font-semibold tracking-wide text-white/70 transition-all duration-200 hover:text-white hover:scale-105"
              >
                Multiplayer
              </button>
              {!isAuthenticated && (
                <div className="mt-6 text-base text-white/70">
                  New here?{' '}
                  <Link
                    href="/register?returnTo=/"
                    className="underline decoration-yellow-500/40 underline-offset-4 transition-all hover:decoration-yellow-500 hover:text-yellow-400"
                  >
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




// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//       <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={180}
//           height={38}
//           priority
//         />
//         <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
//           <li className="mb-2 tracking-[-.01em]">
//             Get started by editing{" "}
//             <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
//               src/app/page.tsx
//             </code>
//             .
//           </li>
//           <li className="tracking-[-.01em]">
//             Save and see your changes instantly.
//           </li>
//         </ol>

//         <div className="flex gap-4 items-center flex-col sm:flex-row">
//           <a
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={20}
//               height={20}
//             />
//             Deploy now
//           </a>
//           <a
//             className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Read our docs
//           </a>
//         </div>
//       </main>
//       <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/file.svg"
//             alt="File icon"
//             width={16}
//             height={16}
//           />
//           Learn
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/window.svg"
//             alt="Window icon"
//             width={16}
//             height={16}
//           />
//           Examples
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/globe.svg"
//             alt="Globe icon"
//             width={16}
//             height={16}
//           />
//           Go to nextjs.org →
//         </a>
//       </footer>
//     </div>
//   );
// }
