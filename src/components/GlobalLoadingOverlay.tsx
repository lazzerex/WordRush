'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LOADING_EVENT, LoadingEventDetail } from '@/lib/ui-events';

const DEFAULT_MESSAGE = 'Loading…';

const GlobalLoadingOverlay = () => {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const pathname = usePathname();

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const showOverlay = (nextMessage?: string) => {
    clearHideTimeout();
    setMessage(nextMessage || DEFAULT_MESSAGE);
    setShouldRender(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const hideOverlay = () => {
    setVisible(false);
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setShouldRender(false);
    }, 220);
  };

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    hideOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoadingEventDetail>).detail;
      if (!detail) {
        return;
      }

      if (detail.active) {
        showOverlay(detail.message);
      } else {
        hideOverlay();
      }
    };

    window.addEventListener(LOADING_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(LOADING_EVENT, handler as EventListener);
      clearHideTimeout();
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center transition-opacity duration-200 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" />
      <div
        className="relative flex flex-col items-center gap-5 rounded-3xl border border-zinc-700/60 bg-zinc-900/90 px-10 py-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]"
        role="status"
        aria-live="polite"
      >
        <div className="wr-loading-spinner" aria-hidden="true" />
        <p className="text-sm font-medium text-zinc-200 tracking-wide">{message}</p>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
