
'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define theme type
type ThemeOption = 'light' | 'dark' | 'sepia';

interface ThemeStyles {
  background: string;
  text: string;
  card: string;
  button: string;
  accent: string;
}

type ThemeMap = {
  [key in ThemeOption]: ThemeStyles;
};

const TypingTest: React.FC = () => {
  // Sample text options
  const textOptions: string[] = [
    "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
    "Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using many programming languages.",
    "A library is a collection of books and other informational materials. Libraries contain a variety of resources, including books, periodicals, newspapers, and digital resources.",
    "The Sun is the star at the center of the Solar System. It is a nearly perfect sphere of hot plasma, with internal convective motion that generates a magnetic field.",
  ];

  // State variables
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('light');
  const [currentText, setCurrentText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [correctChars, setCorrectChars] = useState<number>(0);
  const [incorrectChars, setIncorrectChars] = useState<number>(0);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [testActive, setTestActive] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  
  // Theme options
  const themes: ThemeMap = {
    light: {
      background: 'bg-gray-100',
      text: 'text-gray-800',
      card: 'bg-white',
      button: 'bg-blue-500 hover:bg-blue-600',
      accent: 'border-blue-500',
    },
    dark: {
      background: 'bg-gray-900',
      text: 'text-gray-200',
      card: 'bg-gray-800',
      button: 'bg-blue-600 hover:bg-blue-700',
      accent: 'border-blue-400',
    },
    sepia: {
      background: 'bg-amber-50',
      text: 'text-amber-900',
      card: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700',
      accent: 'border-amber-500',
    },
  };

  // Initialize the test
  useEffect(() => {
    resetTest();
  }, []);

  // Set focus on input field
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [testActive]);

  // Start the test when user starts typing
  const startTest = (): void => {
    if (!testActive && !testCompleted) {
      setStartTime(Date.now());
      setTestActive(true);
    }
  };

  // Calculate WPM and accuracy when test is completed
  useEffect(() => {
    if (testCompleted && startTime && endTime) {
      const minutes = (endTime - startTime) / 60000;
      const words = currentText.split(' ').length;
      const calculatedWpm = Math.round(words / minutes);
      
      setWpm(calculatedWpm);
      
      const totalChars = currentText.length;
      const calculatedAccuracy = Math.round((correctChars / totalChars) * 100);
      setAccuracy(calculatedAccuracy);
    }
  }, [testCompleted, startTime, endTime, currentText, correctChars]);

  // Handle user input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    
    if (!testActive && !testCompleted) {
      startTest();
    }
    
    setUserInput(value);
    
    // Calculate correct and incorrect characters
    let correctCount = 0;
    let incorrectCount = 0;
    
    for (let i = 0; i < value.length; i++) {
      if (i >= currentText.length) {
        break;
      }
      
      if (value[i] === currentText[i]) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }
    
    setCorrectChars(correctCount);
    setIncorrectChars(incorrectCount);
    setCurrentCharIndex(value.length);
    
    // Check if test is completed
    if (value === currentText) {
      setEndTime(Date.now());
      setTestCompleted(true);
      setTestActive(false);
    }
  };

  // Reset the test with a new random text
  const resetTest = (): void => {
    const randomIndex = Math.floor(Math.random() * textOptions.length);
    setCurrentText(textOptions[randomIndex]);
    setUserInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setCurrentCharIndex(0);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTestCompleted(false);
    setTestActive(false);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Toggle between themes
  const toggleTheme = (): void => {
    const themeKeys = Object.keys(themes) as ThemeOption[];
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  // Render characters with color highlighting
  const renderText = (): JSX.Element[] => {
    return currentText.split('').map((char, index) => {
      let className = '';
      
      if (index < userInput.length) {
        className = userInput[index] === char ? 'text-green-500' : 'text-red-500';
      } else if (index === userInput.length) {
        className = 'bg-gray-300 dark:bg-gray-600'; // Cursor position
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  const theme = themes[currentTheme];

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text} flex flex-col items-center py-12 px-4`}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold">WordRush</h1>
          <button 
            onClick={toggleTheme}
            className={`${theme.button} text-white py-2 px-4 rounded-md`}
          >
            Change Theme
          </button>
        </header>
        
        {/* Main card */}
        <div className={`${theme.card} rounded-lg shadow-lg p-6 mb-6`}>
          {/* Text display */}
          <div className={`text-lg mb-8 p-4 rounded-md border ${theme.accent} min-h-32 font-mono leading-relaxed`}>
            {renderText()}
          </div>
          
          {/* Input field */}
          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              disabled={testCompleted}
              className={`w-full p-3 rounded-md border ${theme.accent} ${theme.card} ${theme.text} font-mono text-lg`}
              placeholder="Start typing..."
            />
          </div>
          
          {/* Controls */}
          <div className="flex justify-between items-center">
            <button 
              onClick={resetTest}
              className={`${theme.button} text-white py-2 px-6 rounded-md`}
            >
              Reset
            </button>
            
            {/* Stats display */}
            <div className="flex space-x-6">
              <div className="text-center">
                <p className="text-lg font-bold">{wpm}</p>
                <p className="text-sm">WPM</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{accuracy}%</p>
                <p className="text-sm">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{currentCharIndex}/{currentText.length}</p>
                <p className="text-sm">Progress</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test completed message */}
        {testCompleted && (
          <div className={`${theme.card} rounded-lg shadow-lg p-6 text-center`}>
            <h2 className="text-2xl font-bold mb-4">Test Completed!</h2>
            <p className="text-xl mb-2">Your typing speed: <span className="font-bold">{wpm} WPM</span></p>
            <p className="text-xl">Accuracy: <span className="font-bold">{accuracy}%</span></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingTest;