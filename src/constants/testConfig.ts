/**
 * Test configuration constants
 */

export const DURATION_OPTIONS = [15, 30, 60, 120] as const;
export type DurationOption = typeof DURATION_OPTIONS[number];

export const DEFAULT_DURATION: DurationOption = 30;

export const TEST_CONFIG = {
  ESTIMATED_WPM: 40,
  MIN_WORDS_MULTIPLIER: 1.5,
  MIN_WORDS: 50,
  WORD_POOL_THRESHOLD: 0.8,
} as const;

export const WPM_THRESHOLDS = {
  EXPERT: 100,
  ADVANCED: 80,
  INTERMEDIATE: 60,
  BEGINNER: 40,
} as const;

export const ACCURACY_THRESHOLDS = {
  EXCELLENT: 95,
  GREAT: 90,
  GOOD: 80,
  FAIR: 70,
} as const;
