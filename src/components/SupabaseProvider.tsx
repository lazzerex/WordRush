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
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.warn('[SupabaseProvider] Session load error:', error);
      }
      setIsInitialized(true);
    }).catch(err => {
      console.error('[SupabaseProvider] Session load exception:', err);
      setIsInitialized(true);
    });
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
