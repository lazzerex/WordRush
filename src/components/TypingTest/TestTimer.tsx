/**
 * TestTimer Component
 * Displays the countdown timer
 */

import React from 'react';

interface TestTimerProps {
  timeLeft: number;
}

export const TestTimer: React.FC<TestTimerProps> = ({ timeLeft }) => {
  return (
    <div className="text-center">
      <div className={`text-6xl font-bold text-yellow-500 tracking-tight transition-smooth ${
        timeLeft <= 10 ? 'animate-pulse-smooth text-red-400' : ''
      }`}>
        {timeLeft}
      </div>
      <div className="text-sm text-zinc-600 mt-2">seconds remaining</div>
    </div>
  );
};
