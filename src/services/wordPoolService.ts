/**
 * Word Pool Service Interface
 * Following Interface Segregation Principle
 */

export interface IWordPoolService {
  fetchWords(language?: string): Promise<string[]>;
  clearCache(): void;
}

// Simple API-based implementation with client-side cache
export class ApiWordPoolService implements IWordPoolService {
  private cachedWordPool: string[] | null = null;
  private lastLanguage: string = 'en';

  async fetchWords(language: string = 'en'): Promise<string[]> {
    if (this.cachedWordPool && this.cachedWordPool.length > 0 && this.lastLanguage === language) {
      console.log('[Word Pool Service] Returning cached words:', this.cachedWordPool.length);
      return this.cachedWordPool;
    }

    console.log('[Word Pool Service] Fetching words via API...');
    const response = await fetch(`/api/word-pool?language=${encodeURIComponent(language)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[Word Pool Service] API error:', response.status);
      return [];
    }

    const { words } = (await response.json()) as { words?: string[] };
    const sanitized = (words ?? []).filter((w) => w && w.trim().length > 0);

    this.cachedWordPool = sanitized;
    this.lastLanguage = language;
    return sanitized;
  }

  clearCache(): void {
    this.cachedWordPool = null;
  }
}

// Singleton instance for caching to work across the app
let serviceInstance: ApiWordPoolService | null = null;

/**
 * Factory function to get word pool service (singleton)
 */
export function createWordPoolService(): IWordPoolService {
  if (!serviceInstance) {
    serviceInstance = new ApiWordPoolService();
  }
  return serviceInstance;
}
