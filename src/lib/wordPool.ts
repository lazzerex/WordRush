import { createClient } from '@/lib/supabase/client';

let cachedWordPool: string[] | null = null;

/**
 * Fetches the word pool from Supabase. Results are cached per session to avoid
 * repeat requests while the app is open in the browser.
 */
export async function getWordPool(): Promise<string[]> {
  if (cachedWordPool && cachedWordPool.length > 0) {
    return cachedWordPool;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('word_pool')
    .select('word')
    .order('word', { ascending: true });

  if (error) {
    console.error('Error fetching word pool:', error);
    return [];
  }

  const words = (data ?? [])
    .map((entry) => entry.word)
    .filter((word): word is string => Boolean(word && word.trim().length > 0));

  // Cache the result for the remainder of the session
  cachedWordPool = words;

  return words;
}

/**
 * Clears the word pool cache. Useful if an admin updates the word list and the
 * UI needs to refresh without a full reload.
 */
export function invalidateWordPoolCache() {
  cachedWordPool = null;
}
