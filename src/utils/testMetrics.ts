/**
 * Utility functions for calculating typing test metrics
 */

export interface TestMetrics {
  wpm: number;
  accuracy: number;
  rawWpm: number;
}

/**
 * Calculate Words Per Minute
 */
export function calculateWPM(correctChars: number, duration: number): number {
  const minutes = duration / 60;
  const words = correctChars / 5; // Standard: 5 characters = 1 word
  return Math.round(words / minutes);
}

/**
 * Calculate Raw WPM (including errors)
 */
export function calculateRawWPM(totalChars: number, duration: number): number {
  const minutes = duration / 60;
  const words = totalChars / 5;
  return Math.round(words / minutes);
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correctChars: number, incorrectChars: number): number {
  const totalChars = correctChars + incorrectChars;
  if (totalChars === 0) return 100;
  return Math.round((correctChars / totalChars) * 100);
}

/**
 * Calculate all test metrics at once
 */
export function calculateTestMetrics(
  correctChars: number,
  incorrectChars: number,
  duration: number
): TestMetrics {
  const totalChars = correctChars + incorrectChars;
  
  return {
    wpm: calculateWPM(correctChars, duration),
    rawWpm: calculateRawWPM(totalChars, duration),
    accuracy: calculateAccuracy(correctChars, incorrectChars),
  };
}
