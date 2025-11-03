/**
 * WordsDisplay Component
 * Shows a three-line viewport that advances line-by-line without scrollbars.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lineHeightPx, setLineHeightPx] = useState<number>(56);
  const [wordLineMap, setWordLineMap] = useState<number[]>([]);

  const measureLines = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setWordLineMap([]);
      return;
    }

    let resolvedLineHeight = lineHeightPx;

    if (typeof window !== 'undefined') {
      const computed = parseFloat(window.getComputedStyle(viewport).lineHeight);
      if (Number.isFinite(computed) && computed > 0) {
        resolvedLineHeight = computed;
        if (computed !== lineHeightPx) {
          setLineHeightPx(computed);
        }
      }
    }

    const firstWord = wordRefs.current.find((word) => word !== null);
    if (!firstWord) {
      setWordLineMap([]);
      return;
    }

    const baseTop = firstWord.offsetTop;
    const nextMap = wordRefs.current
      .slice(0, wordsToType.length)
      .map((word) => {
        if (!word) {
          return 0;
        }
        const relativeTop = word.offsetTop - baseTop;
        return Math.round(relativeTop / resolvedLineHeight);
      });

    setWordLineMap((prev) => {
      if (
        prev.length === nextMap.length &&
        prev.every((value, idx) => value === nextMap[idx])
      ) {
        return prev;
      }
      return nextMap;
    });
  }, [lineHeightPx, wordsToType.length]);

  useLayoutEffect(() => {
    measureLines();
  }, [measureLines, wordsToType, currentInput, currentWordIndex, wordStatus]);

  useEffect(() => {
    if (!viewportRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureLines();
    });

    observer.observe(viewportRef.current);

    return () => observer.disconnect();
  }, [measureLines]);

  const fallbackLineIndex = wordLineMap.length > 0
    ? wordLineMap[Math.min(currentWordIndex, wordLineMap.length - 1)]
    : 0;
  const currentLineIndex = wordLineMap[currentWordIndex] ?? fallbackLineIndex;
  const hiddenLineCount = Math.max(0, currentLineIndex - 1);
  const translateY = hiddenLineCount * lineHeightPx;

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
        <div
          ref={viewportRef}
          className="text-2xl leading-loose font-mono overflow-hidden relative"
          style={{
            height: `${lineHeightPx * 3}px`,
            lineHeight: `${lineHeightPx}px`,
          }}
        >
          {isLoadingWords ? (
            <div className="h-full flex items-center justify-center text-zinc-600 animate-pulse">
              Loading word pool...
            </div>
          ) : wordPoolError ? (
            <div className="h-full flex items-center justify-center text-red-400 text-center px-8">
              {wordPoolError}
            </div>
          ) : (
            <div
              ref={wordsContainerRef}
              className="relative transition-transform duration-150 ease-out"
              style={{ transform: `translateY(-${translateY}px)` }}
            >
              {wordsToType.map((word, index) => (
                <span
                  key={index}
                  ref={(el) => {
                    wordRefs.current[index] = el;
                  }}
                >
                  <Word
                    word={word}
                    index={index}
                    currentWordIndex={currentWordIndex}
                    currentInput={currentInput}
                    wordStatus={wordStatus[index] ?? 'pending'}
                  />
                </span>
              ))}
            </div>
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

