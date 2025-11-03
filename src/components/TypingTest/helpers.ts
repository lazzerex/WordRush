/**
 * Helper functions for TypingTest component
 */

/**
 * Generate random words from a word pool
 */
export const generateRandomWords = (
  wordPool: string[],
  duration: number
): string[] => {
  if (!wordPool || wordPool.length === 0) {
    console.warn('Word pool is empty. Please ensure the database is seeded.');
    return [];
  }

  const estimatedWordsNeeded = Math.ceil((duration / 60) * 40 * 1.5);
  const minWords = Math.max(estimatedWordsNeeded, 50);

  const randomWords: string[] = [];
  const usedIndices = new Set<number>();

  while (randomWords.length < minWords) {
    const randomIndex = Math.floor(Math.random() * wordPool.length);

    if (!usedIndices.has(randomIndex) || usedIndices.size >= wordPool.length * 0.8) {
      randomWords.push(wordPool[randomIndex]);
      usedIndices.add(randomIndex);

      if (usedIndices.size >= wordPool.length * 0.8) {
        usedIndices.clear();
      }
    }
  }

  return randomWords;
};

/**
 * Calculate WPM and accuracy
 */
export const calculateStats = (
  correctChars: number,
  incorrectChars: number,
  selectedDuration: number,
  timeLeft: number
): { wpm: number; accuracy: number } => {
  const timeElapsed = selectedDuration - timeLeft;
  const minutes = timeElapsed / 60;
  const calculatedWpm = minutes > 0 ? Math.round((correctChars / 5) / minutes) : 0;
  const totalChars = correctChars + incorrectChars;
  const calculatedAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

  return { wpm: calculatedWpm, accuracy: calculatedAccuracy };
};
