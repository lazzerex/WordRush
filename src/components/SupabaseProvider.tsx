/**
 * Supabase Client Provider
 * Ensures Supabase client is properly initialized before use
 */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isInitialized: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isInitialized: false,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('[SupabaseProvider] Starting initialization...');
    let mounted = true;
    
    async function initializeSupabase() {
      try {
        console.log('[SupabaseProvider] Creating client...');
        const client = createClient();
        
        if (mounted) {
          console.log('[SupabaseProvider] Client created, marking as ready');
          setSupabase(client);
          setIsInitialized(true);
        }
        
        // Get session in background (don't await, don't block)
        console.log('[SupabaseProvider] Triggering session load in background...');
        client.auth.getSession().then(({ data, error }) => {
          if (error) {
            console.warn('[SupabaseProvider] Session load error (non-fatal):', error);
          } else {
            console.log('[SupabaseProvider] Session loaded:', { hasSession: !!data.session });
          }
        }).catch(err => {
          console.error('[SupabaseProvider] Session load exception:', err);
        });
        
      } catch (error) {
        console.error('[SupabaseProvider] Failed to initialize:', error);
        if (mounted) {
          // Still mark as initialized so the app doesn't hang
          setIsInitialized(true);
        }
      }
    }

    initializeSupabase();

    return () => {
      console.log('[SupabaseProvider] Cleaning up');
      mounted = false;
    };
  }, []);

  console.log('[SupabaseProvider] Render - isInitialized:', isInitialized);

  return (
    <SupabaseContext.Provider value={{ supabase, isInitialized }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  return context;
}
