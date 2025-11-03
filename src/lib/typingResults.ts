/**
 * Typing Results API - Refactored to use service layer
 * Maintains backward compatibility while following SOLID principles
 */

import { createTypingResultsService } from '@/services/typingResultsService';
import type { TypingResult } from '@/types/database';

interface SaveResultParams {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
  theme: string;
}

/**
 * @deprecated Use createTypingResultsService().saveResult() instead
 */
export async function saveTypingResult(params: SaveResultParams): Promise<TypingResult | null> {
  const service = createTypingResultsService();
  return service.saveResult(params);
}

/**
 * @deprecated Use createTypingResultsService().getUserResults() instead
 */
export async function getUserResults(limit: number = 10): Promise<TypingResult[]> {
  const service = createTypingResultsService();
  return service.getUserResults(limit);
}

/**
 * @deprecated Use createTypingResultsService().getUserStats() instead
 */
export async function getUserStats() {
  const service = createTypingResultsService();
  return service.getUserStats();
}

/**
 * @deprecated Use createTypingResultsService().deleteResult() instead
 */
export async function deleteResult(resultId: string): Promise<boolean> {
  const service = createTypingResultsService();
  return service.deleteResult(resultId);
}
