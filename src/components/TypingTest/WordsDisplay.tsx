/**
 * WordsDisplay Component
 * Container for displaying words and handling word pool states
 */

import React from 'react';
import { Keyboard } from 'lucide-react';
import { Word } from './Word';
import type { WordStatus } from './types';

interface WordsDisplayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  wordsToType: string[];
  currentWordIndex: number;
  currentInput: string;
  wordStatus: WordStatus[];
  testActive: boolean;
  overlayVisible: boolean;
  isLoadingWords: boolean;
  wordPoolError: string | null;
  onContainerClick: () => void;
}

export const WordsDisplay: React.FC<WordsDisplayProps> = ({
  containerRef,
  wordsToType,
  currentWordIndex,
  currentInput,
  wordStatus,
  testActive,
  overlayVisible,
  isLoadingWords,
  wordPoolError,
  onContainerClick,
}) => {
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`bg-zinc-800/30 rounded-2xl p-12 min-h-[280px] focus:outline-none cursor-text transition-smooth ${
          !testActive 
            ? 'ring-2 ring-yellow-500/30 hover:ring-yellow-500/50' 
            : 'ring-2 ring-yellow-500/60'
        }`}
        onClick={onContainerClick}
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
            wordsToType.slice(0, 150).map((word, index) => (
              <Word
                key={index}
                word={word}
                index={index}
                currentWordIndex={currentWordIndex}
                currentInput={currentInput}
                wordStatus={wordStatus[index]}
              />
            ))
          )}
        </div>
        
        {/* Click to focus overlay */}
        {!testActive && overlayVisible && !isLoadingWords && !wordPoolError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fadeIn">
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
  );
};
