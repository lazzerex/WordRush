'use client';

import React, { useState, useEffect, useRef } from 'react';
import { saveTypingResult } from '@/lib/typingResults';

// Define theme type
type ThemeOption = 'light' | 'dark' | 'sepia' | 'neon' | 'ocean';

// Define test duration options
type DurationOption = 15 | 30 | 60 | 120;

interface ThemeStyles {
  background: string;
  text: string;
  card: string;
  button: string;
  accent: string;
  inactiveText: string;
  activeButton: string;
  gradient: string;
  cardShadow: string;
  highlightText: string;
}

type ThemeMap = {
  [key in ThemeOption]: ThemeStyles;
};

// Custom hook for style injection
const useCustomStyles = () => {
  useEffect(() => {
    // Only run this on the client side
    if (typeof window === 'undefined') return;
    
    // Check if style already exists to prevent duplicates
    const existingStyle = document.getElementById('typing-test-animations');
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.id = 'typing-test-animations';
    style.textContent = `
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes ping {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }

      @keyframes slideInFromTop {
        0% { opacity: 0; transform: translateY(-30px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Fix: Add null check before removing the element
      const styleElement = document.getElementById('typing-test-animations');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);
};

const TypingTest: React.FC = () => {
  // Use the custom hook for style injection
  useCustomStyles();
  
  // Comprehensive word pool for random generation
  const wordPool: string[] = [
    // Common words
    'the', 'of', 'to', 'and', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with',
    'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what',
    'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
    'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make',
    'like', 'into', 'him', 'time', 'has', 'two', 'more', 'very', 'after', 'words', 'first', 'where', 'most', 'know',
    // Technology words
    'computer', 'software', 'hardware', 'internet', 'website', 'database', 'network', 'server', 'client', 'program',
    'algorithm', 'function', 'variable', 'array', 'object', 'method', 'class', 'interface', 'component', 'framework',
    'library', 'application', 'development', 'programming', 'coding', 'debugging', 'testing', 'deployment', 'version',
    'update', 'security', 'encryption', 'authentication', 'authorization', 'protocol', 'bandwidth', 'cloud', 'storage',
    // Professional words
    'business', 'company', 'organization', 'management', 'strategy', 'marketing', 'finance', 'accounting', 'sales',
    'customer', 'service', 'product', 'project', 'team', 'meeting', 'presentation', 'report', 'analysis', 'research',
    'development', 'innovation', 'solution', 'problem', 'opportunity', 'challenge', 'success', 'growth', 'profit',
    'revenue', 'investment', 'budget', 'planning', 'execution', 'performance', 'quality', 'efficiency', 'productivity',
    // Academic words
    'education', 'learning', 'knowledge', 'information', 'study', 'research', 'university', 'college', 'student',
    'teacher', 'professor', 'course', 'subject', 'lesson', 'assignment', 'homework', 'exam', 'test', 'grade',
    'degree', 'certificate', 'diploma', 'scholarship', 'library', 'book', 'article', 'paper', 'thesis', 'theory',
    'practice', 'experiment', 'observation', 'conclusion', 'evidence', 'proof', 'hypothesis', 'methodology', 'data',
    // Nature and science words
    'nature', 'environment', 'climate', 'weather', 'temperature', 'season', 'winter', 'summer', 'spring', 'autumn',
    'water', 'air', 'earth', 'fire', 'energy', 'power', 'force', 'motion', 'speed', 'distance', 'time', 'space',
    'matter', 'element', 'compound', 'molecule', 'atom', 'particle', 'wave', 'frequency', 'amplitude', 'physics',
    'chemistry', 'biology', 'mathematics', 'science', 'technology', 'medicine', 'health', 'disease', 'treatment',
    // Action words
    'run', 'walk', 'jump', 'climb', 'swim', 'fly', 'drive', 'ride', 'travel', 'move', 'stop', 'start', 'begin',
    'end', 'finish', 'complete', 'continue', 'pause', 'break', 'rest', 'sleep', 'wake', 'eat', 'drink', 'cook',
    'clean', 'wash', 'build', 'create', 'make', 'design', 'plan', 'organize', 'arrange', 'prepare', 'practice',
    'learn', 'teach', 'explain', 'understand', 'remember', 'forget', 'think', 'believe', 'hope', 'wish', 'want',
    // Descriptive words
    'good', 'bad', 'great', 'small', 'large', 'big', 'little', 'long', 'short', 'tall', 'high', 'low', 'fast',
    'slow', 'quick', 'easy', 'hard', 'difficult', 'simple', 'complex', 'beautiful', 'ugly', 'nice', 'pretty',
    'smart', 'intelligent', 'clever', 'wise', 'strong', 'weak', 'brave', 'scared', 'happy', 'sad', 'angry',
    'excited', 'calm', 'peaceful', 'busy', 'free', 'empty', 'full', 'new', 'old', 'young', 'fresh', 'clean',
    // Advanced vocabulary
    'accomplish', 'achievement', 'advantage', 'appreciate', 'approach', 'appropriate', 'arrange', 'associate',
    'assumption', 'attitude', 'attribute', 'availability', 'challenge', 'characteristic', 'circumstance', 'collaborate',
    'commitment', 'communicate', 'community', 'competitive', 'comprehensive', 'concentrate', 'conclusion', 'confidence',
    'consequence', 'consideration', 'consistent', 'contribution', 'conversation', 'cooperation', 'coordinate', 'creative',
    'decision', 'demonstrate', 'determine', 'difference', 'difficulty', 'discover', 'discussion', 'distinction',
    'distribute', 'economic', 'effective', 'efficient', 'encourage', 'environment', 'equipment', 'establish',
    'evaluate', 'examination', 'experience', 'explanation', 'expression', 'extraordinary', 'foundation', 'generation',
    'imagination', 'immediately', 'importance', 'impression', 'improvement', 'independence', 'individual', 'influence',
    'initiative', 'inspiration', 'instruction', 'intelligence', 'international', 'investigation', 'knowledge',
    'leadership', 'limitation', 'maintenance', 'management', 'measurement', 'motivation', 'opportunity', 'organization',
    'participation', 'performance', 'personality', 'perspective', 'possibility', 'potential', 'preparation',
    'presentation', 'probability', 'professional', 'recognition', 'recommendation', 'relationship', 'reputation',
    'responsibility', 'satisfaction', 'significance', 'situation', 'specification', 'strategy', 'strength',
    'structure', 'suggestion', 'supervision', 'technology', 'temperature', 'traditional', 'transformation',
    'understanding', 'variation', 'vocabulary'
  ];

  // State variables
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('dark');
  const [currentText, setCurrentText] = useState<string>('');
  const [wordsToType, setWordsToType] = useState<string[]>([]);
  const [typedText, setTypedText] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [correctChars, setCorrectChars] = useState<number>(0);
  const [incorrectChars, setIncorrectChars] = useState<number>(0);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [testActive, setTestActive] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [animationKey, setAnimationKey] = useState<number>(0);

  const textDisplayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultSavedRef = useRef<boolean>(false);
  
  // Theme options
  const themes: ThemeMap = {
    light: {
      background: 'bg-gray-100',
      text: 'text-gray-800',
      card: 'bg-white',
      button: 'bg-blue-500 hover:bg-blue-600',
      accent: 'border-blue-500',
      inactiveText: 'text-gray-400',
      activeButton: 'bg-blue-700',
      gradient: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      cardShadow: 'shadow-lg shadow-blue-100',
      highlightText: 'text-blue-600',
    },
    dark: {
      background: 'bg-gray-900',
      text: 'text-gray-200',
      card: 'bg-gray-800',
      button: 'bg-blue-600 hover:bg-blue-700',
      accent: 'border-blue-600',
      inactiveText: 'text-gray-500',
      activeButton: 'bg-blue-800',
      gradient: 'bg-gradient-to-r from-gray-900 to-gray-800',
      cardShadow: 'shadow-lg shadow-black/30',
      highlightText: 'text-blue-400',
    },
    sepia: {
      background: 'bg-amber-50',
      text: 'text-amber-900',
      card: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700',
      accent: 'border-amber-500',
      inactiveText: 'text-amber-500',
      activeButton: 'bg-amber-800',
      gradient: 'bg-gradient-to-r from-amber-50 to-orange-50',
      cardShadow: 'shadow-lg shadow-amber-200',
      highlightText: 'text-amber-800',
    },
    neon: {
      background: 'bg-gray-950',
      text: 'text-gray-100',
      card: 'bg-gray-900',
      button: 'bg-pink-600 hover:bg-pink-700',
      accent: 'border-pink-500',
      inactiveText: 'text-gray-600',
      activeButton: 'bg-pink-700',
      gradient: 'bg-gradient-to-r from-purple-900 to-pink-900',
      cardShadow: 'shadow-lg shadow-pink-500/20',
      highlightText: 'text-pink-500',
    },
    ocean: {
      background: 'bg-cyan-950',
      text: 'text-cyan-100',
      card: 'bg-cyan-900',
      button: 'bg-teal-600 hover:bg-teal-700',
      accent: 'border-teal-600',
      inactiveText: 'text-cyan-700',
      activeButton: 'bg-teal-700',
      gradient: 'bg-gradient-to-r from-cyan-900 to-blue-900',
      cardShadow: 'shadow-lg shadow-cyan-800/50',
      highlightText: 'text-teal-400',
    },
  };

  // Function to generate random words for typing test
  const generateRandomWords = (duration: number): string[] => {
    // Estimate words needed based on duration and average typing speed
    // Assuming average typing speed of 40 WPM for safety, generate 50% more words
    const estimatedWordsNeeded = Math.ceil((duration / 60) * 40 * 1.5);
    const minWords = Math.max(estimatedWordsNeeded, 50); // At least 50 words
    
    const randomWords: string[] = [];
    const usedIndices = new Set<number>();
    
    // Generate unique random words
    while (randomWords.length < minWords) {
      const randomIndex = Math.floor(Math.random() * wordPool.length);
      
      // Avoid immediate repetition, but allow reuse after some words
      if (!usedIndices.has(randomIndex) || usedIndices.size >= wordPool.length * 0.8) {
        randomWords.push(wordPool[randomIndex]);
        usedIndices.add(randomIndex);
        
        // Clear used indices periodically to allow word reuse
        if (usedIndices.size >= wordPool.length * 0.8) {
          usedIndices.clear();
        }
      }
    }
    
    return randomWords;
  };

  // Initialize the app with random words
  useEffect(() => {
    const randomWords = generateRandomWords(selectedDuration);
    setWordsToType(randomWords);
    setCurrentText(randomWords.join(' '));
    setTimeLeft(selectedDuration);
  }, []);

  // Handle timer
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

  // Set focus when component loads
  useEffect(() => {
    if (containerRef.current && !showMenu) {
      containerRef.current.focus();
    }
  }, [showMenu]);

  // Start the typing game
  const startTypingGame = (): void => {
    setShowMenu(false);
    // Focus the container after hiding menu
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.focus();
      }
    }, 100);
  };

  // Return to menu
  const returnToMenu = (): void => {
    setShowMenu(true);
    // Reset all test states with new random words
    const randomWords = generateRandomWords(selectedDuration);
    setWordsToType(randomWords);
    setCurrentText(randomWords.join(' '));
    setTypedText('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setCurrentCharIndex(0);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTestCompleted(false);
    setTestActive(false);
    setTimeLeft(selectedDuration);
    setCursorPosition(0);
    setCurrentWordIndex(0);
  };

  // Start the test
  const startTest = (): void => {
    if (!testActive && !testCompleted) {
      setStartTime(Date.now());
      setTestActive(true);
      setTimeLeft(selectedDuration);
      
      // Reset the result saved flag for new test
      resultSavedRef.current = false;
      
      // Trigger animation
      setShowAnimation(true);
      setAnimationKey(prev => prev + 1);
      
      // Hide animation after a delay
      setTimeout(() => {
        setShowAnimation(false);
      }, 2000);
    }
  };

  // Complete the test
  const completeTest = async (): Promise<void> => {
    // Prevent duplicate saves
    if (resultSavedRef.current) {
      return;
    }
    
    setEndTime(Date.now());
    setTestCompleted(true);
    setTestActive(false);
    
    // Calculate final WPM and accuracy
    if (startTime) {
      // For timed tests, use the selected duration
      const elapsedMinutes = selectedDuration / 60;
      const wordsTyped = correctChars / 5; // Standard: 5 chars = 1 word
      const finalWpm = Math.round(wordsTyped / elapsedMinutes);
      setWpm(finalWpm);
      
      const totalAttemptedChars = correctChars + incorrectChars;
      const calculatedAccuracy = totalAttemptedChars > 0 
        ? Math.round((correctChars / totalAttemptedChars) * 100) 
        : 100;
      setAccuracy(calculatedAccuracy);

      // Save result to database (only once)
      resultSavedRef.current = true;
      await saveTypingResult({
        wpm: finalWpm,
        accuracy: calculatedAccuracy,
        correctChars: correctChars,
        incorrectChars: incorrectChars,
        duration: selectedDuration,
        theme: currentTheme,
      });
    }
    
    // Trigger animation
    setShowAnimation(true);
    setAnimationKey(prev => prev + 1);
    
    // Hide animation after a delay
    setTimeout(() => {
      setShowAnimation(false);
    }, 2000);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (testCompleted) return;
    
    // Start test on first key press
    if (!testActive) {
      startTest();
    }
    
    // Skip modifier keys and special keys
    if (e.ctrlKey || e.altKey || e.metaKey || 
        e.key === 'Shift' || e.key === 'Control' || 
        e.key === 'Alt' || e.key === 'Meta' || 
        e.key === 'CapsLock' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'ArrowUp' || 
        e.key === 'ArrowDown' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight') {
      return;
    }
    
    e.preventDefault();
    
    // Calculate current WPM while typing
    if (startTime && testActive) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        // Calculate WPM only during the test
        const wordsTyped = correctChars / 5; // Standard: 5 chars = 1 word
        const currentWpm = Math.round(wordsTyped / elapsedMinutes);
        setWpm(currentWpm);
      }
    }
    
    // Handle backspace
    if (e.key === 'Backspace') {
      if (typedText.length > 0) {
        const newTypedText = typedText.slice(0, -1);
        setTypedText(newTypedText);
        setCurrentCharIndex(newTypedText.length);
        setCursorPosition(newTypedText.length);
        
        // Recalculate correct and incorrect characters
        let correctCount = 0;
        let incorrectCount = 0;
        
        for (let i = 0; i < newTypedText.length; i++) {
          if (newTypedText[i] === currentText[i]) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        }
        
        setCorrectChars(correctCount);
        setIncorrectChars(incorrectCount);
        
        // Update current word index
        const words = currentText.split(' ');
        let charCount = 0;
        for (let i = 0; i < words.length; i++) {
          charCount += words[i].length + 1; // +1 for space
          if (charCount > newTypedText.length) {
            setCurrentWordIndex(i);
            break;
          }
        }
      }
      return;
    }
    
    // Handle regular key press
    const newTypedText = typedText + e.key;
    setTypedText(newTypedText);
    setCurrentCharIndex(newTypedText.length);
    setCursorPosition(newTypedText.length);
    
    // Calculate correct and incorrect characters
    let correctCount = 0;
    let incorrectCount = 0;
    
    for (let i = 0; i < newTypedText.length; i++) {
      if (i >= currentText.length) {
        break;
      }
      
      if (newTypedText[i] === currentText[i]) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }
    
    setCorrectChars(correctCount);
    setIncorrectChars(incorrectCount);
    
    // Update current word index
    const words = currentText.split(' ');
    let charCount = 0;
    for (let i = 0; i < words.length; i++) {
      charCount += words[i].length + 1; // +1 for space
      if (charCount > newTypedText.length) {
        setCurrentWordIndex(i);
        break;
      }
    }
    
    // Check if test is completed by typing all text
    if (newTypedText.length >= currentText.length) {
      completeTest();
    }
  };

  // Reset the test with new random words
  const resetTest = (): void => {
    const randomWords = generateRandomWords(selectedDuration);
    setWordsToType(randomWords);
    setCurrentText(randomWords.join(' '));
    setTypedText('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setCurrentCharIndex(0);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTestCompleted(false);
    setTestActive(false);
    setTimeLeft(selectedDuration);
    setCursorPosition(0);
    setCurrentWordIndex(0);
    
    // Reset the result saved flag for new test
    resultSavedRef.current = false;
    
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  // Toggle between themes
  const toggleTheme = (): void => {
    const themeKeys = Object.keys(themes) as ThemeOption[];
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
    
    // Focus the container after theme change if not in menu
    if (!showMenu) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }, 50);
    }
  };

  // Change test duration
  const changeDuration = (duration: DurationOption): void => {
    if (selectedDuration !== duration) {
      setSelectedDuration(duration);
      
      // Reset the test state completely with new random words
      const randomWords = generateRandomWords(duration);
      setWordsToType(randomWords);
      setCurrentText(randomWords.join(' '));
      setTypedText('');
      setStartTime(null);
      setEndTime(null);
      setWpm(0);
      setAccuracy(100);
      setCurrentCharIndex(0);
      setCorrectChars(0);
      setIncorrectChars(0);
      setTestCompleted(false);
      setTestActive(false);
      setTimeLeft(duration);
      setCursorPosition(0);
      setCurrentWordIndex(0);
      
      // Reset the result saved flag for new test
      resultSavedRef.current = false;
      
      // Focus the container after a short delay to ensure UI has updated
      if (!showMenu) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.focus();
          }
        }, 50);
      }
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Render text with correct styling
  const renderText = () => {
    const theme = themes[currentTheme];
    
    return (
      <div 
        ref={textDisplayRef}
        className="font-mono text-lg leading-relaxed whitespace-pre-wrap"
      >
        {currentText.split('').map((char, index) => {
          let className = theme.inactiveText; // Default: inactive text
          
          if (index < typedText.length) {
            // Character has been typed
            className = typedText[index] === char 
              ? 'text-green-500 transition-all duration-150 transform' // Correct
              : 'text-red-500 transition-all duration-150 transform';  // Incorrect
          } else if (index === typedText.length) {
            // Current cursor position
            className = `${theme.text} bg-gray-500 animate-pulse transition-all duration-150`;
          } else {
            // Upcoming text
            className = theme.inactiveText;
          }
          
          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  const theme = themes[currentTheme];

  // Render menu screen
  if (showMenu) {
    return (
      <div className={`min-h-screen ${theme.background} ${theme.text} flex flex-col items-center justify-center py-8 px-4 transition-colors duration-300 ${theme.gradient} overflow-y-auto`}>
        <div className="w-full max-w-md">
          {/* Main Menu Card */}
          <div className={`${theme.card} rounded-lg ${theme.cardShadow} p-8 text-center animate-[slideInFromTop_0.8s_ease-out]`}>
            {/* Title */}
            <h1 className={`text-5xl font-bold mb-8 ${theme.highlightText} animate-[bounceIn_1s_ease-out]`}>
              WORDRUSH
            </h1>
            <div className={`w-24 h-1 ${theme.background === 'bg-gray-900' ? 'bg-blue-600' : theme.background === 'bg-gray-100' ? 'bg-blue-500' : theme.background === 'bg-amber-50' ? 'bg-amber-600' : theme.background === 'bg-gray-950' ? 'bg-pink-500' : 'bg-teal-600'} mx-auto mb-8 rounded-full`}></div>
            
            {/* Start Game Button */}
            <button 
              onClick={startTypingGame}
              className={`w-full ${theme.button} text-white py-4 px-6 rounded-lg text-xl font-semibold mb-4 transition-all duration-200 transform hover:scale-105 ${theme.cardShadow} animate-[fadeIn_1s_ease-out_0.2s_both]`}
            >
              START TYPING
            </button>
            
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`w-full border-2 ${theme.accent} ${theme.text} py-3 px-6 rounded-lg text-lg font-medium transition-all duration-200 transform hover:scale-105 hover:${theme.background === 'bg-gray-900' ? 'bg-gray-700' : theme.background === 'bg-gray-100' ? 'bg-gray-200' : theme.background === 'bg-amber-50' ? 'bg-amber-100' : theme.background === 'bg-gray-950' ? 'bg-gray-800' : 'bg-cyan-800'} animate-[fadeIn_1s_ease-out_0.4s_both]`}
            >
              🌙 TOGGLE THEME
            </button>
          </div>
          
          {/* How to Play Section */}
          <div className={`${theme.card} rounded-lg ${theme.cardShadow} p-6 mt-6 animate-[fadeIn_1s_ease-out_0.6s_both]`}>
            <h2 className={`text-2xl font-bold mb-4 text-center ${theme.highlightText}`}>
              How to Play
            </h2>
            <div className="space-y-3 text-sm">
              <p className={`${theme.text} leading-relaxed`}>
                🎯 Type randomly generated words as fast and accurately as possible
              </p>
              <p className={`${theme.text} leading-relaxed`}>
                ⏱️ Choose your time limit and beat the clock to improve your WPM
              </p>
              <p className={`${theme.text} leading-relaxed`}>
                🔄 Each test generates unique random words for fresh challenges
              </p>
            </div>
          </div>
          
          {/* Current Theme Display */}
          <div className={`text-center mt-4 ${theme.text} text-sm opacity-70`}>
            Current Theme: <span className="capitalize font-semibold">{currentTheme}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render typing test game
  return (
    <div 
      ref={containerRef}
      className={`min-h-screen ${theme.background} ${theme.text} flex flex-col items-center py-12 px-4 focus:outline-none transition-colors duration-300 ${theme.gradient}`}
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      {showAnimation && (
        <div 
          key={animationKey}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className={`animate-[ping_1s_ease-in-out_1] opacity-0 text-6xl font-bold ${theme.highlightText}`}>
            {testActive ? "GO!" : testCompleted ? "DONE!" : ""}
          </div>
        </div>
      )}
      
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
          <h1 className={`text-5xl font-bold mb-4 md:mb-0 ${theme.highlightText} transition-all duration-300 hover:scale-105`}>
            WordRush
          </h1>
          <div className="flex space-x-2">
            <button 
              onClick={returnToMenu}
              className={`border-2 ${theme.accent} ${theme.text} py-2 px-4 rounded-md text-sm transition-all duration-200 transform hover:scale-105 hover:${theme.background === 'bg-gray-900' ? 'bg-gray-700' : theme.background === 'bg-gray-100' ? 'bg-gray-200' : theme.background === 'bg-amber-50' ? 'bg-amber-100' : theme.background === 'bg-gray-950' ? 'bg-gray-800' : 'bg-cyan-800'}`}
            >
              Menu
            </button>
            <button 
              onClick={toggleTheme}
              className={`${theme.button} text-white py-2 px-4 rounded-md text-sm transition-all duration-200 transform hover:scale-105 ${theme.cardShadow}`}
            >
              Theme
            </button>
          </div>
        </header>
        
        {/* Test duration selector */}
        <div className="mb-6 flex justify-center space-x-2">
          {[15, 30, 60, 120].map((duration) => (
            <button
              key={duration}
              onClick={() => changeDuration(duration as DurationOption)}
              className={`py-2 px-4 rounded-md text-white text-sm transition-all duration-200
                ${selectedDuration === duration 
                  ? `${theme.activeButton} transform scale-105 ${theme.cardShadow}`
                  : theme.button}`}
              disabled={testActive}
            >
              {duration}s
            </button>
          ))}
        </div>
        
        {/* Stats Display */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className={`${theme.card} rounded-lg p-4 text-center ${theme.cardShadow}`}>
            <p className={`text-2xl font-bold ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : theme.highlightText}`}>
              {formatTime(timeLeft)}
            </p>
            <p className="text-xs opacity-70">Time Left</p>
          </div>
         
          <div className={`${theme.card} rounded-lg p-4 text-center ${theme.cardShadow}`}>
            <p className={`text-2xl font-bold ${theme.highlightText}`}>{wordsToType.length}</p>
            <p className="text-xs opacity-70">Total Words</p>
          </div>
        </div>
        
        {/* Main card */}
        <div className={`${theme.card} rounded-lg ${theme.cardShadow} p-6 mb-6 transition-all duration-300 transform hover:scale-[1.01]`}>          
          {/* Text display */}
          <div 
            className={`p-4 rounded-md border ${theme.accent} min-h-36 max-h-56 overflow-y-auto mb-8 transition-all duration-300`}
          >
            {renderText()}
          </div>
          
          {/* Instructions */}
          <div className={`text-center mb-4 text-sm ${theme.text}`}>
            {!testActive && !testCompleted ? (
              <p>Click here and start typing to begin test</p>
            ) : testActive ? (
              <p>Type the words above as fast and accurately as possible</p>
            ) : (
              <p>Test completed!</p>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex justify-center">
            <button 
              onClick={resetTest}
              className={`${theme.button} text-white py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 ${theme.cardShadow}`}
            >
              🔄 New Words
            </button>
          </div>
        </div>
        
        {/* Test completed message */}
        {testCompleted && (
          <div className={`${theme.card} rounded-lg ${theme.cardShadow} p-6 text-center mt-6 border ${theme.accent} transform transition-all duration-500 animate-[fadeIn_0.5s_ease-in-out]`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme.highlightText}`}>Test Completed!</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className={`text-center p-4 rounded-lg ${theme.background === 'bg-gray-900' ? 'bg-gray-700' : theme.background === 'bg-gray-100' ? 'bg-gray-200' : theme.background === 'bg-amber-50' ? 'bg-amber-200' : theme.background === 'bg-gray-950' ? 'bg-gray-800' : 'bg-cyan-800'} transition-all duration-300 transform hover:scale-105`}>
                <h3 className="text-sm uppercase tracking-wide mb-1">TYPING SPEED</h3>
                <p className={`text-4xl font-bold ${theme.highlightText} animate-[pulse_2s_infinite]`}>{wpm} <span className="text-sm font-normal">WPM</span></p>
              </div>
              <div className={`text-center p-4 rounded-lg ${theme.background === 'bg-gray-900' ? 'bg-gray-700' : theme.background === 'bg-gray-100' ? 'bg-gray-200' : theme.background === 'bg-amber-50' ? 'bg-amber-200' : theme.background === 'bg-gray-950' ? 'bg-gray-800' : 'bg-cyan-800'} transition-all duration-300 transform hover:scale-105`}>
                <h3 className="text-sm uppercase tracking-wide mb-1">ACCURACY</h3>
                <p className={`text-4xl font-bold ${theme.highlightText} animate-[pulse_2s_infinite]`}>{accuracy}<span className="text-sm font-normal">%</span></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="text-center">
                <p className={`font-bold ${theme.highlightText}`}>{correctChars}</p>
                <p className="opacity-70">Correct</p>
              </div>
              <div className="text-center">
                <p className={`font-bold ${theme.highlightText}`}>{incorrectChars}</p>
                <p className="opacity-70">Incorrect</p>
              </div>
              <div className="text-center">
                <p className={`font-bold ${theme.highlightText}`}>{Math.round((correctChars / 5))}</p>
                <p className="opacity-70">Words Typed</p>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingTest;