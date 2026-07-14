import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn(
      '[Supabase Client] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
}
