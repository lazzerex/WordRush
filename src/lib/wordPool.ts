/**
 * Word Pool API - Refactored to use service layer
 * Maintains backward compatibility while following SOLID principles
 */

import { createWordPoolService } from '@/services/wordPoolService';

/**
 * Fetches the word pool. Results are cached per session.
 * @deprecated Consider using createWordPoolService() directly for better control
 */
export async function getWordPool(): Promise<string[]> {
  const service = createWordPoolService();
  return service.fetchWords();
}

/**
 * Clears the word pool cache.
 */
export function invalidateWordPoolCache() {
  const service = createWordPoolService();
  service.clearCache();
}
