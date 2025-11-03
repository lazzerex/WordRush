/**
 * ResetButton Component
 * Button to reset the typing test
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ResetButtonProps {
  isLoadingWords: boolean;
  wordPoolError: string | null;
  onReset: () => void;
}

export const ResetButton: React.FC<ResetButtonProps> = ({
  isLoadingWords,
  wordPoolError,
  onReset,
}) => {
  return (
    <button
      onClick={onReset}
      disabled={isLoadingWords || !!wordPoolError}
      className="p-2 text-zinc-500 hover:text-yellow-500 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105 hover:rotate-90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RotateCcw className="w-5 h-5" />
    </button>
  );
};
