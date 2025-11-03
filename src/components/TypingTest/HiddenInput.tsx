/**
 * HiddenInput Component
 * Hidden input field that captures user typing
 */

import React from 'react';

interface HiddenInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  currentInput: string;
  isLoadingWords: boolean;
  wordPoolError: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const HiddenInput: React.FC<HiddenInputProps> = ({
  inputRef,
  currentInput,
  isLoadingWords,
  wordPoolError,
  onInputChange,
}) => {
  return (
    <input
      ref={inputRef}
      type="text"
      value={currentInput}
      onChange={onInputChange}
      className="sr-only"
      autoFocus
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck="false"
      disabled={isLoadingWords || !!wordPoolError}
    />
  );
};
