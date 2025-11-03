/**
 * Type definitions for TypingTest components
 */

export type DurationOption = 15 | 30 | 60 | 120;
export type WordStatus = 'correct' | 'incorrect' | 'pending';

export interface TestState {
  wordsToType: string[];
  currentWordIndex: number;
  currentInput: string;
  correctChars: number;
  incorrectChars: number;
  timeLeft: number;
  testActive: boolean;
  testComplete: boolean;
  selectedDuration: DurationOption;
  wpm: number;
  accuracy: number;
  wordStatus: WordStatus[];
  overlayVisible: boolean;
}

export interface KeystrokeData {
  timestamp: number;
  key: string;
  wordIndex: number;
  isCorrect: boolean;
}
