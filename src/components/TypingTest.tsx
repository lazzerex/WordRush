'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getWordPool } from '@/lib/wordPool';
import { Menu, ShoppingBag, Palette, RotateCcw, Globe } from 'lucide-react';
import Dock from './TypingTest/Dock';
import { TestTimer } from './TypingTest/TestTimer';
import { WordsDisplay } from './TypingTest/WordsDisplay';
import { HiddenInput } from './TypingTest/HiddenInput';
import { TestResults } from './TypingTest/TestResults';
import { generateRandomWords, calculateStats } from './TypingTest/helpers';
import type { DurationOption, WordStatus, KeystrokeData } from './TypingTest/types';
import { broadcastCoinsEvent, broadcastLoadingEvent } from '@/lib/ui-events';

const WORDS_BUFFER_THRESHOLD = 50;
const WORDS_BATCH_SIZE = 120;
const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt (Beta)' }
];

export interface TypingTestProps {
  onOpenMenu?: () => void;
}

const TypingTest: React.FC<TypingTestProps> = ({ onOpenMenu }) => {
  // State management
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  // Remove dropdown, just show tooltip and toggle language on click
  const [wordsToType, setWordsToType] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [correctChars, setCorrectChars] = useState<number>(0);
  const [incorrectChars, setIncorrectChars] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [testActive, setTestActive] = useState<boolean>(false);
  const [testComplete, setTestComplete] = useState<boolean>(false);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [wordStatus, setWordStatus] = useState<WordStatus[]>([]);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [isLoadingWords, setIsLoadingWords] = useState<boolean>(true);
  const [wordPoolError, setWordPoolError] = useState<string | null>(null);
  const [coinsEarned, setCoinsEarned] = useState<number | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSavedRef = useRef<boolean>(false);
  const keystrokesRef = useRef<KeystrokeData[]>([]);
  const wordsTypedRef = useRef<string[]>([]);
  const testStartTimeRef = useRef<number>(0);

  // Load word pool and initialize words
  useEffect(() => {
    const loadWordPool = async () => {
      setIsLoadingWords(true);
      setWordPoolError(null);

      try {
        const words = await getWordPool(selectedLanguage);

        if (!words || words.length === 0) {
          console.warn('Word pool is empty. Please populate the word_pool table.');
          setWordPool([]);
          setWordsToType([]);
          setWordStatus([]);
          setWordPoolError('Word pool is empty. Please populate the word_pool table.');
          resetAllState(selectedDuration);
          return;
        }

        setWordPool(words);
        const randomWords = generateRandomWords(words, selectedDuration);
        initializeTest(randomWords, selectedDuration);
      } catch (error) {
        console.error('Failed to load word pool:', error);
        setWordPoolError('Failed to load word pool. Please try again later.');
      } finally {
        setIsLoadingWords(false);
      }
    };

    loadWordPool();
  }, [selectedDuration, selectedLanguage]);


  // Handle menu open from logo (custom event)
  useEffect(() => {
  const handler = () => {
    // Immediately stop any active test
    if (testActive) {
      setTestActive(false);
    }
    
    if (!overlayVisible) {
      handleReset();
    }
    if (onOpenMenu) onOpenMenu();
  };
  window.addEventListener('wordrush:openMenu', handler);
  return () => window.removeEventListener('wordrush:openMenu', handler);
}, [overlayVisible, onOpenMenu, testActive]); // Add testActive to dependencies

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (testActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            clearInterval(interval);
            completeTest();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testActive, timeLeft]);

  // Initialize test with words
  const initializeTest = (words: string[], duration: DurationOption) => {
    setWordsToType(words);
    setWordStatus(new Array(words.length).fill('pending'));
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setTimeLeft(duration);
    setTestActive(false);
    setTestComplete(false);
    setWpm(0);
    setAccuracy(100);
    setOverlayVisible(true);
  setCoinsEarned(null);
    resultSavedRef.current = false;
    keystrokesRef.current = [];
    wordsTypedRef.current = [];
    testStartTimeRef.current = 0;
  };

  // Dynamically top up the word queue so long tests never run dry
  const extendWordQueueIfNeeded = (nextIndex: number) => {
    if (wordPool.length === 0) {
      return;
    }

    setWordsToType((prevWords) => {
      if (nextIndex + WORDS_BUFFER_THRESHOLD < prevWords.length) {
        return prevWords;
      }

      const queuedWords: string[] = [];
      let projectedLength = prevWords.length;

      while (nextIndex + WORDS_BUFFER_THRESHOLD >= projectedLength) {
        const batch = generateRandomWords(wordPool, selectedDuration, WORDS_BATCH_SIZE);
        if (batch.length === 0) {
          break;
        }
        queuedWords.push(...batch);
        projectedLength += batch.length;
      }

      if (queuedWords.length === 0) {
        return prevWords;
      }

      setWordStatus((prevStatus) => ([
        ...prevStatus,
        ...new Array<WordStatus>(queuedWords.length).fill('pending'),
      ]));

      return [...prevWords, ...queuedWords];
    });
  };

  // Reset all state
  const resetAllState = (duration: DurationOption) => {
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setTimeLeft(duration);
    setTestActive(false);
    setTestComplete(false);
    setWpm(0);
    setAccuracy(100);
    setOverlayVisible(true);
  setCoinsEarned(null);
    resultSavedRef.current = false;
    keystrokesRef.current = [];
    wordsTypedRef.current = [];
    testStartTimeRef.current = 0;
  };

  // Complete test and save results
  const completeTest = async () => {
    if (resultSavedRef.current) return;

    setTestActive(false);
    setTestComplete(true);

    const stats = calculateStats(correctChars, incorrectChars, selectedDuration, timeLeft);
    setWpm(stats.wpm);
    setAccuracy(stats.accuracy);

    try {
      resultSavedRef.current = true;
      broadcastLoadingEvent({ active: true, message: 'Syncing your rewards…' });
      const response = await fetch('/api/submit-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keystrokes: keystrokesRef.current,
          wordsTyped: wordsTypedRef.current,
          expectedWords: wordsToType,
          duration: selectedDuration,
          startTime: testStartTimeRef.current,
          theme: 'monkeytype-inspired',
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      const applyServerData = (data: any) => {
        if (!data) {
          return;
        }

        if (typeof data.wpm === 'number') {
          setWpm(data.wpm);
        }

        if (typeof data.accuracy === 'number') {
          setAccuracy(data.accuracy);
        }

        if (typeof data.coinsEarned === 'number') {
          setCoinsEarned(data.coinsEarned);
        }

        if (typeof data.totalCoins === 'number') {
          broadcastCoinsEvent(data.totalCoins);
        }
      };
      if (!response.ok) {
        // Handle unauthorized (not logged in) silently - this is expected behavior
        if (response.status === 401) {
          // User is not logged in - don't log error, just skip saving
          // Stats are already calculated and displayed
          return;
        }
        
        // For other errors, log but don't break the UX
        console.warn('Could not save result:', result.error);
        applyServerData(result.data);
      } else {
        // Successfully saved - update with server-validated stats if available
        applyServerData(result.data);
      }
    } catch (error) {
      // Network or other errors - log but don't break UX
      console.warn('Error saving result:', error);
    } finally {
      broadcastLoadingEvent({ active: false });
    }
  };

  // Handle input changes
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoadingWords || wordPoolError || wordPool.length === 0) {
      return;
    }

    const value = e.target.value;

    // Start test on first keystroke
    if (!testActive && !testComplete) {
      setTestActive(true);
      testStartTimeRef.current = Date.now();
      keystrokesRef.current = [];
      wordsTypedRef.current = [];
    }

    // Track keystroke for server validation
    if (testActive && value.length > currentInput.length) {
      const newChar = value[value.length - 1];
      const currentWord = wordsToType[currentWordIndex];
      const expectedChar = currentWord[value.length - 1];

      keystrokesRef.current.push({
        timestamp: Date.now(),
        key: newChar,
        wordIndex: currentWordIndex,
        isCorrect: newChar === expectedChar,
      });
    }

    // Check if user pressed space (word complete)
    if (value.endsWith(' ')) {
      const typedWord = value.trim();
      const currentWord = wordsToType[currentWordIndex];

      wordsTypedRef.current.push(typedWord);

      // Check if word is correct
      if (typedWord === currentWord) {
        setWordStatus((prev) => {
          const newStatus = [...prev];
          newStatus[currentWordIndex] = 'correct';
          return newStatus;
        });
        setCorrectChars((prev) => prev + currentWord.length + 1);
      } else {
        setWordStatus((prev) => {
          const newStatus = [...prev];
          newStatus[currentWordIndex] = 'incorrect';
          return newStatus;
        });
        setIncorrectChars((prev) => prev + Math.abs(typedWord.length - currentWord.length) + 1);
        setCorrectChars((prev) => prev + Math.min(typedWord.length, currentWord.length));
      }

      setCurrentWordIndex((prev) => {
        const nextIndex = prev + 1;
        extendWordQueueIfNeeded(nextIndex);
        return nextIndex;
      });
      setCurrentInput('');
    } else {
      setCurrentInput(value);
    }
  };

  // Reset test
  const handleReset = () => {
    if (isLoadingWords || wordPoolError || wordPool.length === 0) {
      return;
    }

    const randomWords = generateRandomWords(wordPool, selectedDuration);
    initializeTest(randomWords, selectedDuration);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Change duration
  const handleDurationChange = (duration: DurationOption) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);

    if (isLoadingWords || wordPoolError || wordPool.length === 0) {
      return;
    }

    const randomWords = generateRandomWords(wordPool, duration);
    initializeTest(randomWords, duration);
  };

  // Handle container click
  const handleContainerClick = () => {
    if (isLoadingWords || wordPoolError) {
      return;
    }

    setOverlayVisible(false);
    inputRef.current?.focus();
  };

  // Always focus hidden input when overlay is dismissed and test is not complete
  useEffect(() => {
    if (!testComplete && !overlayVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [overlayVisible, testComplete]);

  // Allow starting test by pressing any key
  useEffect(() => {
    if (!testActive && overlayVisible && !testComplete && !isLoadingWords && !wordPoolError) {
      const handleKeyDown = (e: KeyboardEvent) => {
        setOverlayVisible(false);
        inputRef.current?.focus();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [testActive, overlayVisible, testComplete, isLoadingWords, wordPoolError]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Dock bar between header and typing area */}
      <div className="flex justify-center mb-10">
        <Dock
          items={[
            {
              icon: <Menu className="w-5 h-5 text-zinc-400" />,
              label: 'Menu',
              onClick: () => {
                // Stop and reset the test, then open the menu
                if (!overlayVisible) {
                  handleReset();
                }
                if (onOpenMenu) onOpenMenu();
              },
              className: 'hover:bg-zinc-800',
            },
            {
              icon: <ShoppingBag className="w-5 h-5 text-zinc-400" />,
              label: 'Shop',
              onClick: () => window.location.href = '/shop',
              className: 'hover:bg-zinc-800',
            },
            {
              icon: <Palette className="w-5 h-5 text-zinc-400" />,
              label: 'Customize',
              onClick: () => window.location.href = '/customize',
              className: 'hover:bg-zinc-800',
            },
            { icon: <div className="w-px h-8 bg-zinc-800" />, label: '', onClick: () => {}, className: 'pointer-events-none bg-transparent border-none shadow-none' },
            ...([15, 30, 60, 120] as DurationOption[]).map((duration) => ({
              icon: <span className={`text-sm font-semibold ${selectedDuration === duration ? 'text-yellow-500' : 'text-zinc-500'}`}>{duration}s</span>,
              label: `${duration} seconds`,
              onClick: () => handleDurationChange(duration),
              className: `${selectedDuration === duration ? 'bg-zinc-800 border-zinc-700' : 'hover:bg-zinc-800'}`,
            })),
            { icon: <div className="w-px h-8 bg-zinc-800" />, label: '', onClick: () => {}, className: 'pointer-events-none bg-transparent border-none shadow-none' },
            {
              icon: <RotateCcw className="w-5 h-5 text-zinc-400" />,
              label: 'Reset',
              onClick: handleReset,
              className: 'hover:bg-zinc-800',
            },
            {
              icon: <Globe className="w-5 h-5 text-zinc-400" />,
              label: SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label || 'Language',
              onClick: () => {
                // Toggle to next language in SUPPORTED_LANGUAGES
                const idx = SUPPORTED_LANGUAGES.findIndex(l => l.code === selectedLanguage);
                const nextIdx = (idx + 1) % SUPPORTED_LANGUAGES.length;
                setSelectedLanguage(SUPPORTED_LANGUAGES[nextIdx].code);
              },
              className: 'hover:bg-zinc-800',
            },
          ]}
          spring={{ mass: 0.1, stiffness: 150, damping: 12 }}
          magnification={70}
          distance={140}
          baseItemSize={50}
        />
      </div>

      {/* Main Typing Area or Results */}
      {!testComplete ? (
        <div className="space-y-8 animate-fadeIn">
          <TestTimer timeLeft={timeLeft} />
          <WordsDisplay
            containerRef={containerRef}
            wordsToType={wordsToType}
            currentWordIndex={currentWordIndex}
            currentInput={currentInput}
            wordStatus={wordStatus}
            testActive={testActive}
            overlayVisible={overlayVisible}
            isLoadingWords={isLoadingWords}
            wordPoolError={wordPoolError}
            onContainerClick={handleContainerClick}
          />
          <HiddenInput
            inputRef={inputRef}
            currentInput={currentInput}
            isLoadingWords={isLoadingWords}
            wordPoolError={wordPoolError}
            onInputChange={handleInput}
          />
        </div>
      ) : (
        <TestResults
          wpm={wpm}
          accuracy={accuracy}
          correctChars={correctChars}
          incorrectChars={incorrectChars}
          duration={selectedDuration}
          coinsEarned={coinsEarned}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default TypingTest;
