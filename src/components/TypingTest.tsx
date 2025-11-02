'use client';

import React, { useState, useEffect, useRef } from 'react';
import { saveTypingResult } from '@/lib/typingResults';
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
  const wordPool: string[] = [
    'the', 'of', 'to', 'and', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with',
    'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what',
    'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
    'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make',
    'like', 'into', 'him', 'time', 'has', 'two', 'more', 'very', 'after', 'words', 'first', 'where', 'most', 'know',
    'computer', 'software', 'hardware', 'internet', 'website', 'database', 'network', 'server', 'client', 'program',
    'algorithm', 'function', 'variable', 'array', 'object', 'method', 'class', 'interface', 'component', 'framework',
    'library', 'application', 'development', 'programming', 'coding', 'debugging', 'testing', 'deployment', 'version',
    'update', 'security', 'encryption', 'authentication', 'authorization', 'protocol', 'bandwidth', 'cloud', 'storage',
    'business', 'company', 'organization', 'management', 'strategy', 'marketing', 'finance', 'accounting', 'sales',
    'customer', 'service', 'product', 'project', 'team', 'meeting', 'presentation', 'report', 'analysis', 'research',
  ];

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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSavedRef = useRef<boolean>(false);

  // Generate random words
  const generateRandomWords = (duration: number): string[] => {
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

  // Initialize words
  useEffect(() => {
    const randomWords = generateRandomWords(selectedDuration);
    setWordsToType(randomWords);
    setWordStatus(new Array(randomWords.length).fill('pending'));
    setTimeLeft(selectedDuration);
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
    
    // Save to database
    try {
      resultSavedRef.current = true;
      await saveTypingResult({
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        correctChars,
        incorrectChars,
        duration: selectedDuration,
        theme: 'monkeytype-inspired',
      });
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  // Handle input
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Start test on first keystroke
    if (!testActive && !testComplete) {
      setTestActive(true);
    }
    
    // Check if user pressed space (word complete)
    if (value.endsWith(' ')) {
      const typedWord = value.trim();
      const currentWord = wordsToType[currentWordIndex];
      
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
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Change duration
  const changeDuration = (duration: DurationOption) => {
    setSelectedDuration(duration);
    const randomWords = generateRandomWords(duration);
    setWordsToType(randomWords);
    setTimeLeft(duration);
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
        className="relative inline-block whitespace-nowrap align-top"
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
              let className = 'text-zinc-500'; // Default (not typed yet)
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
              <span className="text-red-400">
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
          <span className={status === 'correct' ? 'text-zinc-300' : 'text-red-400'}>
            {word}
          </span>
        ) : (
          // Future words
          <span className="text-zinc-600">
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
          <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/50">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/50">
            <Keyboard className="w-5 h-5" />
          </button>
        </div>

        {/* Duration Selector */}
        <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1">
          {[15, 30, 60, 120].map((duration) => (
            <button
              key={duration}
              onClick={() => changeDuration(duration as DurationOption)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                selectedDuration === duration
                  ? 'bg-zinc-700 text-yellow-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {duration}s
            </button>
          ))}
        </div>

        <button
          onClick={resetTest}
          className="p-2 text-zinc-500 hover:text-yellow-500 transition-colors rounded-lg hover:bg-zinc-800/50"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Typing Area */}
      {!testComplete ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Timer */}
          <div className="text-center">
            <div className="text-6xl font-bold text-yellow-500 tracking-tight">
              {timeLeft}
            </div>
            <div className="text-sm text-zinc-600 mt-2">seconds remaining</div>
          </div>

          {/* Words Display */}
          <div className="relative">
            <div
              ref={containerRef}
              className={`bg-zinc-800/30 rounded-2xl p-12 min-h-[280px] focus:outline-none cursor-text overflow-hidden transition-all ${
                !testActive 
                  ? 'ring-2 ring-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]' 
                  : 'ring-2 ring-yellow-600/50'
              }`}
              onClick={() => {
                // hide the overlay immediately on click and focus the hidden input
                setOverlayVisible(false);
                inputRef.current?.focus();
              }}
              tabIndex={0}
            >
              <div className="text-2xl leading-loose font-mono h-[220px] overflow-hidden">
                {wordsToType.slice(0, 150).map((word, index) => renderWord(word, index))}
              </div>
              
              {/* Click to focus overlay (will hide on container click or when test starts) */}
              {!testActive && (
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out ${
                    overlayVisible ? 'opacity-100 scale-100' : 'opacity-0 -translate-y-2'
                  }`}
                >
                  <div className={`bg-zinc-900/95 border-2 border-yellow-500/60 rounded-2xl px-8 py-4 backdrop-blur-sm ${
                    overlayVisible ? 'animate-pulse-soft' : ''
                  }`}
                  >
                    <div className="flex items-center gap-3 text-yellow-400">
                      <Keyboard className="w-6 h-6" />
                      <span className="text-lg font-semibold">Click here to start typing</span>
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
          />
        </div>
      ) : (
        /* Results Screen */
        <div className="animate-scaleIn">
          <div className="bg-zinc-800/30 rounded-2xl p-12 space-y-8">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* WPM */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Zap className="w-4 h-4" />
                  <div className="text-sm font-medium">WPM</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{wpm}</div>
              </div>

              {/* Accuracy */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Target className="w-4 h-4" />
                  <div className="text-sm font-medium">Accuracy</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{accuracy}%</div>
              </div>

              {/* Duration */}
              <div className="text-center p-6 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2">
                  <Timer className="w-4 h-4" />
                  <div className="text-sm font-medium">Time</div>
                </div>
                <div className="text-5xl font-bold text-yellow-500">{selectedDuration}s</div>
              </div>
            </div>

            {/* Character Stats */}
            <div className="flex items-center justify-center gap-8 text-sm">
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
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={resetTest}
                className="px-8 py-3 bg-yellow-600 text-zinc-900 rounded-xl hover:bg-yellow-500 transition-all font-medium flex items-center gap-2 glow-yellow-sm"
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
