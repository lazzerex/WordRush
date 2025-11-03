/**
 * Custom hook for managing typing test state
 * Following Single Responsibility Principle
 */

import { useState, useRef } from 'react';
import type { DurationOption } from '@/constants/testConfig';

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
  wordStatus: ('correct' | 'incorrect' | 'pending')[];
  overlayVisible: boolean;
}

export interface TestActions {
  setWordsToType: (words: string[]) => void;
  setCurrentWordIndex: (index: number) => void;
  setCurrentInput: (input: string) => void;
  setCorrectChars: (chars: number) => void;
  setIncorrectChars: (chars: number) => void;
  setTimeLeft: (time: number) => void;
  setTestActive: (active: boolean) => void;
  setTestComplete: (complete: boolean) => void;
  setSelectedDuration: (duration: DurationOption) => void;
  setWpm: (wpm: number) => void;
  setAccuracy: (accuracy: number) => void;
  setWordStatus: (status: ('correct' | 'incorrect' | 'pending')[]) => void;
  setOverlayVisible: (visible: boolean) => void;
  resetTest: () => void;
}

const initialState: TestState = {
  wordsToType: [],
  currentWordIndex: 0,
  currentInput: '',
  correctChars: 0,
  incorrectChars: 0,
  timeLeft: 30,
  testActive: false,
  testComplete: false,
  selectedDuration: 30,
  wpm: 0,
  accuracy: 100,
  wordStatus: [],
  overlayVisible: true,
};

export function useTestState(defaultDuration: DurationOption = 30) {
  const [state, setState] = useState<TestState>({
    ...initialState,
    timeLeft: defaultDuration,
    selectedDuration: defaultDuration,
  });

  const actions: TestActions = {
    setWordsToType: (words) => setState((prev) => ({ ...prev, wordsToType: words })),
    setCurrentWordIndex: (index) => setState((prev) => ({ ...prev, currentWordIndex: index })),
    setCurrentInput: (input) => setState((prev) => ({ ...prev, currentInput: input })),
    setCorrectChars: (chars) => setState((prev) => ({ ...prev, correctChars: chars })),
    setIncorrectChars: (chars) => setState((prev) => ({ ...prev, incorrectChars: chars })),
    setTimeLeft: (time) => setState((prev) => ({ ...prev, timeLeft: time })),
    setTestActive: (active) => setState((prev) => ({ ...prev, testActive: active })),
    setTestComplete: (complete) => setState((prev) => ({ ...prev, testComplete: complete })),
    setSelectedDuration: (duration) => setState((prev) => ({ ...prev, selectedDuration: duration })),
    setWpm: (wpm) => setState((prev) => ({ ...prev, wpm })),
    setAccuracy: (accuracy) => setState((prev) => ({ ...prev, accuracy })),
    setWordStatus: (status) => setState((prev) => ({ ...prev, wordStatus: status })),
    setOverlayVisible: (visible) => setState((prev) => ({ ...prev, overlayVisible: visible })),
    resetTest: () => setState((prev) => ({
      ...initialState,
      timeLeft: prev.selectedDuration,
      selectedDuration: prev.selectedDuration,
    })),
  };

  return { state, actions };
}
