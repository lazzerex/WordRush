/**
 * DurationSelector Component
 * Allows users to select test duration
 */

import React from 'react';
import type { DurationOption } from './types';

interface DurationSelectorProps {
  selectedDuration: DurationOption;
  isLoadingWords: boolean;
  wordPoolError: string | null;
  onDurationChange: (duration: DurationOption) => void;
}

const DURATIONS: DurationOption[] = [15, 30, 60, 120];

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  isLoadingWords,
  wordPoolError,
  onDurationChange,
}) => {
  return (
    <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1">
      {DURATIONS.map((duration) => (
        <button
          key={duration}
          onClick={() => onDurationChange(duration)}
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
  );
};
