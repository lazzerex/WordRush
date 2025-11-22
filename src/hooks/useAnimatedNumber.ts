import { useEffect, useRef, useState } from 'react';

export type AnimatedTrend = 'up' | 'down' | null;

/**
 * Smoothly animates a numeric value and exposes the current motion trend (up/down).
 */
export function useAnimatedNumber(targetValue: number | null | undefined, duration = 600) {
  const [displayValue, setDisplayValue] = useState<number>(() =>
    typeof targetValue === 'number' ? targetValue : 0
  );
  const [trend, setTrend] = useState<AnimatedTrend>(null);
  const previousValueRef = useRef<number | null>(
    typeof targetValue === 'number' ? targetValue : null
  );
  const rafRef = useRef<number | null>(null);
  const resetTrendTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof targetValue !== 'number') {
      return undefined;
    }

    const startValue = previousValueRef.current ?? targetValue;

    if (previousValueRef.current === null) {
      previousValueRef.current = targetValue;
      setDisplayValue(targetValue);
      return undefined;
    }

    if (startValue === targetValue) {
      setDisplayValue(targetValue);
      return undefined;
    }

    setTrend(targetValue > startValue ? 'up' : 'down');

    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = easeOutCubic(progress);
      const nextValue = startValue + (targetValue - startValue) * eased;
      setDisplayValue(nextValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        previousValueRef.current = targetValue;
        resetTrendTimeout.current = setTimeout(() => setTrend(null), 800);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (resetTrendTimeout.current) {
        clearTimeout(resetTrendTimeout.current);
        resetTrendTimeout.current = null;
      }
    };
  }, [targetValue, duration]);

  return {
    value: displayValue,
    trend,
  };
}
