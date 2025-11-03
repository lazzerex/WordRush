/**
 * Word Pool Service Interface
 * Following Interface Segregation Principle
 */

export interface IWordPoolService {
  fetchWords(): Promise<string[]>;
  clearCache(): void;
}

/**
 * Supabase implementation of Word Pool Service with caching
 */
import { createClient } from '@/lib/supabase/client';

export class SupabaseWordPoolService implements IWordPoolService {
  private cachedWordPool: string[] | null = null;

  async fetchWords(): Promise<string[]> {
    // Return cached data if available
    if (this.cachedWordPool && this.cachedWordPool.length > 0) {
      return this.cachedWordPool;
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

    // Cache the result
    this.cachedWordPool = words;

    return words;
  }

  clearCache(): void {
    this.cachedWordPool = null;
  }
}

// Singleton instance for caching to work across the app
let serviceInstance: SupabaseWordPoolService | null = null;

/**
 * Factory function to get word pool service (singleton)
 */
export function createWordPoolService(): IWordPoolService {
  if (!serviceInstance) {
    serviceInstance = new SupabaseWordPoolService();
  }
  return serviceInstance;
}
