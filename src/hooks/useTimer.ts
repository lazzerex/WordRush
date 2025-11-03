/**
 * Custom hook for timer management
 */

import { useEffect, useRef } from 'react';

interface UseTimerOptions {
  duration: number;
  isActive: boolean;
  onTick?: (timeLeft: number) => void;
  onComplete?: () => void;
}

export function useTimer({ duration, isActive, onTick, onComplete }: UseTimerOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = useRef(duration);

  useEffect(() => {
    timeLeftRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        timeLeftRef.current -= 1;
        
        if (onTick) {
          onTick(timeLeftRef.current);
        }

        if (timeLeftRef.current <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (onComplete) {
            onComplete();
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onTick, onComplete]);

  return {
    stop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
  };
}
