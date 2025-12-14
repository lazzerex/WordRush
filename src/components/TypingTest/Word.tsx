/**
 * Word Component
 * Renders a single word with character-by-character coloring
 */

import React from 'react';
import type { WordStatus } from './types';

interface WordProps {
  word: string;
  index: number;
  currentWordIndex: number;
  currentInput: string;
  wordStatus: WordStatus;
}

export const Word: React.FC<WordProps> = ({
  word,
  index,
  currentWordIndex,
  currentInput,
  wordStatus,
}) => {
  const isCurrentWord = index === currentWordIndex;
  const isPastWord = index < currentWordIndex;
  const isFutureWord = index > currentWordIndex;

  const baseWidthCh = Math.max(word.length, 1);
  const displayWidthCh = isCurrentWord
    ? Math.max(baseWidthCh, Math.max(currentInput.length, 1))
    : baseWidthCh;
  const cursorPositionCh = isCurrentWord ? Math.min(currentInput.length, displayWidthCh) : 0;

  return (
    <span 
      className={`relative inline-block whitespace-nowrap align-top transition-smooth ${
        isPastWord ? 'opacity-60' : 'opacity-100'
      } font-mono roboto-mono font-medium`}
      style={{
        width: `${displayWidthCh}ch`,
        marginRight: '1.5rem',
      }}
    >
      {isCurrentWord ? (
        <>
          {/* Current word - character by character */}
            {word.split('').map((char, charIndex) => {
            const typedChar = currentInput[charIndex];
            let className = 'text-zinc-500 transition-colors duration-150';
            let highlightClass = '';

            if (typedChar !== undefined) {
              className = typedChar === char ? 'text-zinc-100' : 'text-red-400';
            } else if (charIndex === currentInput.length) {
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
          
          {/* Cursor */}
          <span
            className="pointer-events-none absolute w-[1.5px] h-[1.35em] bg-yellow-400 rounded animate-caret"
            style={{
              left: `calc(${cursorPositionCh}ch)`,
              top: '50%',
              transform: 'translate(-1px, -50%)',
            }}
          />
        </>
      ) : isPastWord ? (
        /* Past words */
        <span className={`transition-smooth ${wordStatus === 'correct' ? 'text-green-400' : 'text-red-400'} font-medium`}>
          {word}
        </span>
      ) : (
        /* Future words */
        <span className="text-zinc-500 transition-smooth font-medium">
          {word}
        </span>
      )}
    </span>
  );
};
