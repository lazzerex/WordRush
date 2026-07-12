/**
 * Supabase Client Provider
 * Ensures Supabase client is properly initialized before use
 */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface SupabaseContextType {
  supabase: SupabaseClient;
  isInitialized: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState<SupabaseClient>(() => createClient());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let settled = false;
    const markInitialized = () => {
      if (settled) return;
      settled = true;
      setIsInitialized(true);
    };

    // getSession() can hang indefinitely if another tab holds the browser-wide
    // auth lock (navigator.locks) and stalls (e.g. backgrounded tab, network
    // hiccup). Don't let that block this tab's initialization forever.
    const timeout = setTimeout(() => {
      console.warn('[SupabaseProvider] Session load timed out, proceeding uninitialized');
      markInitialized();
    }, 5000);

    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.warn('[SupabaseProvider] Session load error:', error);
      }
      markInitialized();
    }).catch(err => {
      console.error('[SupabaseProvider] Session load exception:', err);
      markInitialized();
    }).finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, isInitialized }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}
