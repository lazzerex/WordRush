/**
 * TestResults Component
 * Displays test completion screen with stats and actions
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';
import StatsChart from '../StatsChart';

interface TestResultsProps {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
  onReset: () => void;
}

export const TestResults: React.FC<TestResultsProps> = ({
  wpm,
  accuracy,
  correctChars,
  incorrectChars,
  duration,
  onReset,
}) => {
  return (
    <div className="animate-scaleIn">
      <div className="bg-zinc-800/30 rounded-2xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 animate-fadeIn">
          <h2 className="text-2xl font-bold text-zinc-50">Test Complete!</h2>
          <p className="text-sm text-zinc-400">Here's how you performed</p>
        </div>

        {/* Stats Chart Component */}
        <div className="animate-fadeIn animation-delay-100">
          <StatsChart
            wpm={wpm}
            accuracy={accuracy}
            correctChars={correctChars}
            incorrectChars={incorrectChars}
            duration={duration}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-2 animate-fadeIn animation-delay-400">
          <button
            onClick={onReset}
            className="px-6 py-2.5 bg-yellow-600 text-zinc-900 rounded-xl hover:bg-yellow-500 transition-smooth font-medium flex items-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};
