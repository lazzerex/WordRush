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
  const [supabase] = useState<SupabaseClient>(() => {
    console.log('[SupabaseProvider] Creating client synchronously...');
    return createClient();
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('[SupabaseProvider] Starting session load...');
    
    // Load session to ensure auth is ready
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('[SupabaseProvider] Session load error:', error);
      } else {
        console.log('[SupabaseProvider] Session loaded:', { hasSession: !!data.session });
      }
      setIsInitialized(true);
    }).catch(err => {
      console.error('[SupabaseProvider] Session load exception:', err);
      setIsInitialized(true);
    });
  }, [supabase]);

  console.log('[SupabaseProvider] Render - isInitialized:', isInitialized);

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
