/**
 * Utility functions for word pool generation and manipulation
 */

import { TEST_CONFIG } from '@/constants/testConfig';

/**
 * Generate random words from a pool without too many repetitions
 */
export function generateRandomWords(
  wordPool: string[],
  duration: number
): string[] {
  if (!wordPool || wordPool.length === 0) {
    console.warn('Word pool is empty. Please ensure the database is seeded.');
    return [];
  }

  const estimatedWordsNeeded = Math.ceil(
    (duration / 60) * TEST_CONFIG.ESTIMATED_WPM * TEST_CONFIG.MIN_WORDS_MULTIPLIER
  );
  const minWords = Math.max(estimatedWordsNeeded, TEST_CONFIG.MIN_WORDS);

  const randomWords: string[] = [];
  const usedIndices = new Set<number>();

  while (randomWords.length < minWords) {
    const randomIndex = Math.floor(Math.random() * wordPool.length);

    if (
      !usedIndices.has(randomIndex) ||
      usedIndices.size >= wordPool.length * TEST_CONFIG.WORD_POOL_THRESHOLD
    ) {
      randomWords.push(wordPool[randomIndex]);
      usedIndices.add(randomIndex);

      if (usedIndices.size >= wordPool.length * TEST_CONFIG.WORD_POOL_THRESHOLD) {
        usedIndices.clear();
      }
    }
  }

  return randomWords;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
