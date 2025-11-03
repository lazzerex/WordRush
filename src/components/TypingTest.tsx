'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getWordPool } from '@/lib/wordPool';
import { 
  RotateCcw, 
  Settings, 
  Keyboard,
  Timer,
  Zap,
  Target
} from 'lucide-react';

// Define test duration options
type DurationOption = 15 | 30 | 60 | 120;

const TypingTest: React.FC = () => {
  // Comprehensive word pool
  const [wordPool, setWordPool] = useState<string[]>([]);
  // State management
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
  const [wordStatus, setWordStatus] = useState<('correct' | 'incorrect' | 'pending')[]>([]);
  // Overlay visibility when user hasn't started (click) yet
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [isLoadingWords, setIsLoadingWords] = useState<boolean>(true);
  const [wordPoolError, setWordPoolError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSavedRef = useRef<boolean>(false);
  
  // Security: Track keystrokes and test session for server-side validation
  const keystrokesRef = useRef<Array<{
    timestamp: number;
    key: string;
    wordIndex: number;
    isCorrect: boolean;
  }>>([]);
  const wordsTypedRef = useRef<string[]>([]);
  const testStartTimeRef = useRef<number>(0);

  // Generate random words from loaded pool; allow override for freshly fetched words
  const generateRandomWords = (duration: number, poolOverride?: string[]): string[] => {
    const pool = poolOverride ?? wordPool;
    if (!pool || pool.length === 0) {
      console.warn('Word pool is empty. Please ensure the database is seeded.');
      return [];
    }

    const estimatedWordsNeeded = Math.ceil((duration / 60) * 40 * 1.5);
    const minWords = Math.max(estimatedWordsNeeded, 50);
    
    const randomWords: string[] = [];
    const usedIndices = new Set<number>();
    
    while (randomWords.length < minWords) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      
      if (!usedIndices.has(randomIndex) || usedIndices.size >= pool.length * 0.8) {
        randomWords.push(pool[randomIndex]);
        usedIndices.add(randomIndex);
        
        if (usedIndices.size >= pool.length * 0.8) {
          usedIndices.clear();
        }
      }
    }
    
    return randomWords;
  };

  // Load word pool and initialize words
  useEffect(() => {
    const loadWordPool = async () => {
      setIsLoadingWords(true);
      setWordPoolError(null);

      try {
        const words = await getWordPool();

        if (!words || words.length === 0) {
          console.warn('Word pool is empty. Please populate the word_pool table.');
          setWordPool([]);
          setWordsToType([]);
          setWordStatus([]);
          setWordPoolError('Word pool is empty. Please populate the word_pool table.');
          setCurrentWordIndex(0);
          setCurrentInput('');
          setCorrectChars(0);
          setIncorrectChars(0);
          setTimeLeft(selectedDuration);
          setTestActive(false);
          setTestComplete(false);
          setWpm(0);
          setAccuracy(100);
          setOverlayVisible(true);
          resultSavedRef.current = false;
          keystrokesRef.current = [];
          wordsTypedRef.current = [];
          testStartTimeRef.current = 0;
          return;
        }

        setWordPool(words);

        const randomWords = generateRandomWords(selectedDuration, words);
        setWordsToType(randomWords);
        setWordStatus(new Array(randomWords.length).fill('pending'));
        setCurrentWordIndex(0);
        setCurrentInput('');
        setCorrectChars(0);
        setIncorrectChars(0);
        setTimeLeft(selectedDuration);
        setTestActive(false);
        setTestComplete(false);
        setWpm(0);
        setAccuracy(100);
        setOverlayVisible(true);
        resultSavedRef.current = false;
        keystrokesRef.current = [];
        wordsTypedRef.current = [];
        testStartTimeRef.current = 0;
      } catch (error) {
        console.error('Failed to load word pool:', error);
        setWordPoolError('Failed to load word pool. Please try again later.');
      } finally {
        setIsLoadingWords(false);
      }
    };

    loadWordPool();
  }, []);

  // Timer
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

  // Calculate WPM and accuracy
  const calculateStats = () => {
    const timeElapsed = selectedDuration - timeLeft;
    const minutes = timeElapsed / 60;
    const calculatedWpm = minutes > 0 ? Math.round((correctChars / 5) / minutes) : 0;
    const totalChars = correctChars + incorrectChars;
    const calculatedAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
    
    setWpm(calculatedWpm);
    setAccuracy(calculatedAccuracy);
    
    return { wpm: calculatedWpm, accuracy: calculatedAccuracy };
  };

  // Complete test
  const completeTest = async () => {
    if (resultSavedRef.current) return;
    
    setTestActive(false);
    setTestComplete(true);
    
    const stats = calculateStats();
    
    // Save to database via secure API endpoint
    try {
      resultSavedRef.current = true;
      
      // Submit to secure API route with keystroke validation
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
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Failed to save result:', result.error);
        // Update UI with server-calculated stats if available
        if (result.data) {
          setWpm(result.data.wpm);
          setAccuracy(result.data.accuracy);
        }
      } else {
        // Update with server-validated stats
        if (result.data) {
          setWpm(result.data.wpm);
          setAccuracy(result.data.accuracy);
        }
      }
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  // Handle input
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoadingWords || wordPoolError || wordPool.length === 0) {
      return;
    }

    const value = e.target.value;
    
    // Start test on first keystroke
    if (!testActive && !testComplete) {
      setTestActive(true);
      testStartTimeRef.current = Date.now(); // Record test start time
      keystrokesRef.current = []; // Reset keystrokes
      wordsTypedRef.current = []; // Reset words typed
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
      
      // Store the typed word for validation
      wordsTypedRef.current.push(typedWord);
      
      // Check if word is correct
      if (typedWord === currentWord) {
        setWordStatus(prev => {
          const newStatus = [...prev];
          newStatus[currentWordIndex] = 'correct';
          return newStatus;
        });
        setCorrectChars(prev => prev + currentWord.length + 1); // +1 for space
      } else {
        setWordStatus(prev => {
          const newStatus = [...prev];
          newStatus[currentWordIndex] = 'incorrect';
          return newStatus;
        });
        setIncorrectChars(prev => prev + Math.abs(typedWord.length - currentWord.length) + 1);
        setCorrectChars(prev => prev + Math.min(typedWord.length, currentWord.length));
      }
      
      setCurrentWordIndex(prev => prev + 1);
      setCurrentInput('');
      calculateStats();
    } else {
      setCurrentInput(value);
    }
  };

  // Reset test
  const resetTest = () => {
    if (isLoadingWords) {
      console.warn('Word pool is still loading. Please wait before resetting the test.');
      return;
    }

    if (wordPoolError || wordPool.length === 0) {
      console.warn('Word pool is unavailable. Cannot reset the test.');
      return;
    }

    const randomWords = generateRandomWords(selectedDuration);
    setWordsToType(randomWords);
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setTimeLeft(selectedDuration);
    setTestActive(false);
    setTestComplete(false);
    setWpm(0);
    setAccuracy(100);
    setWordStatus(new Array(randomWords.length).fill('pending'));
    resultSavedRef.current = false;
    setOverlayVisible(true);
    
    // Reset tracking data
    keystrokesRef.current = [];
    wordsTypedRef.current = [];
    testStartTimeRef.current = 0;
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Change duration
  const changeDuration = (duration: DurationOption) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);

    if (isLoadingWords) {
      console.warn('Word pool is still loading. Duration change will apply once words are ready.');
      return;
    }

    if (wordPoolError || wordPool.length === 0) {
      console.warn('Word pool is unavailable. Cannot regenerate words for the selected duration.');
      return;
    }

    const randomWords = generateRandomWords(duration);
    setWordsToType(randomWords);
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setTestActive(false);
    setTestComplete(false);
    setWpm(0);
    setAccuracy(100);
    setWordStatus(new Array(randomWords.length).fill('pending'));
    resultSavedRef.current = false;
    setOverlayVisible(true);
    
    // Reset tracking data
    keystrokesRef.current = [];
    wordsTypedRef.current = [];
    testStartTimeRef.current = 0;
  };

  // Render word with character-by-character coloring
  const renderWord = (word: string, index: number) => {
    const isCurrentWord = index === currentWordIndex;
    const status = wordStatus[index];

    const baseWidthCh = Math.max(word.length, 1);
    const displayWidthCh = isCurrentWord
      ? Math.max(baseWidthCh, Math.max(currentInput.length, 1))
      : baseWidthCh;
    const cursorPositionCh = isCurrentWord ? Math.min(currentInput.length, displayWidthCh) : 0;

    const wordElement = (
      <span 
        className={`relative inline-block whitespace-nowrap align-top transition-smooth ${
          index < currentWordIndex ? 'opacity-60' : 'opacity-100'
        }`}
        style={{
          width: `${displayWidthCh}ch`,
          marginRight: '0.75rem',
        }}
      >
        {isCurrentWord ? (
          // Current word - character by character
          <>
            {word.split('').map((char, charIndex) => {
              const typedChar = currentInput[charIndex];
              let className = 'text-zinc-500 transition-colors duration-150'; // Default (not typed yet)
              let highlightClass = '';

              if (typedChar !== undefined) {
                // Already typed
                className = typedChar === char ? 'text-zinc-100' : 'text-red-400';
              } else if (charIndex === currentInput.length) {
                // Current character to type - highlight it (no padding to avoid layout shift)
                highlightClass = 'bg-zinc-700/80 rounded-sm outline outline-1 outline-zinc-700/60';
              }

              return (
                <span key={charIndex} className={`${className} ${highlightClass}`}>
                  {char}
                </span>
              );
            })}
            {/* Extra characters typed */}
            {currentInput.length > word.length && (
              <span className="text-red-400 animate-shake">
                {currentInput.slice(word.length)}
              </span>
            )}
            <span
              className="pointer-events-none absolute w-[2px] h-[1.4em] bg-yellow-400 rounded-full animate-caret"
              style={{
                left: `calc(${cursorPositionCh}ch)`,
                top: '50%',
                transform: 'translate(-1px, -50%)',
              }}
            />
          </>
        ) : index < currentWordIndex ? (
          // Past words
          <span className={`transition-smooth ${status === 'correct' ? 'text-zinc-300' : 'text-red-400'}`}>
            {word}
          </span>
        ) : (
          // Future words
          <span className="text-zinc-600 transition-smooth">
            {word}
          </span>
        )}
      </span>
    );
    
    return <React.Fragment key={index}>{wordElement}</React.Fragment>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Settings Bar */}
      <div className="mb-8 flex items-center justify-between animate-fadeIn">
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105">
            <Keyboard className="w-5 h-5" />
          </button>
        </div>

        {/* Duration Selector */}
        <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1">
          {[15, 30, 60, 120].map((duration) => (
            <button
              key={duration}
              onClick={() => changeDuration(duration as DurationOption)}
              disabled={isLoadingWords || !!wordPoolError}
              className={`px-4 py-2 rounded-md font-medium transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedDuration === duration
                  ? 'bg-zinc-700 text-yellow-500 scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40'
              }`}
            >
              {duration}s
            </button>
          ))}
        </div>

        <button
          onClick={resetTest}
          disabled={isLoadingWords || !!wordPoolError}
          className="p-2 text-zinc-500 hover:text-yellow-500 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105 hover:rotate-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Typing Area */}
      {!testComplete ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Timer */}
          <div className="text-center">
            <div className={`text-6xl font-bold text-yellow-500 tracking-tight transition-smooth ${
              timeLeft <= 10 ? 'animate-pulse-smooth text-red-400' : ''
            }`}>
              {timeLeft}
            </div>
            <div className="text-sm text-zinc-600 mt-2">seconds remaining</div>
          </div>

          {/* Words Display */}
          <div className="relative">
            <div
              ref={containerRef}
              className={`bg-zinc-800/30 rounded-2xl p-12 min-h-[280px] focus:outline-none cursor-text transition-smooth ${
                !testActive 
                  ? 'ring-2 ring-yellow-500/30 hover:ring-yellow-500/50' 
                  : 'ring-2 ring-yellow-500/60'
              }`}
              onClick={() => {
                if (isLoadingWords || wordPoolError) {
                  return;
                }

                // hide the overlay immediately on click and focus the hidden input
                setOverlayVisible(false);
                inputRef.current?.focus();
              }}
              tabIndex={0}
            >
              <div className="text-2xl leading-loose font-mono h-[220px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin">
                {isLoadingWords ? (
                  <div className="h-full flex items-center justify-center text-zinc-600 animate-pulse">
                    Loading word pool...
                  </div>
                ) : wordPoolError ? (
                  <div className="h-full flex items-center justify-center text-red-400 text-center px-8">
                    {wordPoolError}
                  </div>
                ) : (
                  wordsToType.slice(0, 150).map((word, index) => renderWord(word, index))
                )}
              </div>
              
              {/* Click to focus overlay (will hide on container click or when test starts) */}
              {!testActive && overlayVisible && !isLoadingWords && !wordPoolError && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fadeIn"
                >
                  <div className="bg-zinc-900/90 border border-yellow-500/40 rounded-xl px-6 py-3 backdrop-blur-sm transform transition-smooth hover:scale-105">
                    <div className="flex items-center gap-3 text-yellow-400/90">
                      <Keyboard className="w-5 h-5" />
                      <span className="text-base font-medium">Click here to start typing</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInput}
            className="sr-only"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            disabled={isLoadingWords || !!wordPoolError}
          />
        </div>
      ) : (
        /* Results Screen */
        <div className="animate-scaleIn">
          <div className="bg-zinc-800/30 rounded-2xl p-12 space-y-8">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* WPM */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl transform transition-smooth hover:scale-[1.02] hover:bg-zinc-800/70 animate-slideInUp">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Zap className="w-4 h-4" />
                  <div className="text-sm font-medium">WPM</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{wpm}</div>
              </div>

              {/* Accuracy */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl transform transition-smooth hover:scale-[1.02] hover:bg-zinc-800/70 animate-slideInUp animation-delay-100">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Target className="w-4 h-4" />
                  <div className="text-sm font-medium">Accuracy</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{accuracy}%</div>
              </div>

              {/* Duration */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl transform transition-smooth hover:scale-[1.02] hover:bg-zinc-800/70 animate-slideInUp animation-delay-200">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Timer className="w-4 h-4" />
                  <div className="text-sm font-medium">Time</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{selectedDuration}s</div>
              </div>
            </div>

            {/* Character Stats */}
            <div className="flex items-center justify-center gap-8 text-sm animate-fadeIn animation-delay-300">
              <div>
                <span className="text-zinc-500">Correct: </span>
                <span className="text-green-500 font-medium">{correctChars}</span>
              </div>
              <div>
                <span className="text-zinc-500">Incorrect: </span>
                <span className="text-red-500 font-medium">{incorrectChars}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 pt-4 animate-fadeIn animation-delay-400">
              <button
                onClick={resetTest}
                className="px-8 py-3 bg-yellow-600 text-zinc-900 rounded-xl hover:bg-yellow-500 transition-smooth font-medium flex items-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingTest;
