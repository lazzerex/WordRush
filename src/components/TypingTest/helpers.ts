/**
 * Helper functions for TypingTest component
 */

/**
 * Generate random words from a word pool.
 * Defaults to Monkeytype-style batches of 200 words but allows
 * custom sizes so the queue can be topped up mid-test.
 */
export const generateRandomWords = (
  wordPool: string[],
  duration: number,
  count = 200
): string[] => {
  if (!wordPool || wordPool.length === 0) {
    console.warn('Word pool is empty. Please ensure the database is seeded.');
    return [];
  }

  const randomWords: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * wordPool.length);
    randomWords.push(wordPool[randomIndex]);
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
  
  // Prevent unrealistic WPM spikes at the start by requiring minimum elapsed time
  // This avoids showing 400+ WPM when only 1-2 seconds have passed
  const calculatedWpm = timeElapsed >= 3 && minutes > 0 
    ? Math.round((correctChars / 5) / minutes) 
    : 0;
    
  const totalChars = correctChars + incorrectChars;
  const calculatedAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

  return { wpm: calculatedWpm, accuracy: calculatedAccuracy };
};
