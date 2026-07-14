import { describe, expect, it } from 'vitest';
import { calculateStats, generateRandomWords } from './helpers';

describe('calculateStats', () => {
  it('computes wpm and accuracy once minimum elapsed time has passed', () => {
    // duration 60, timeLeft 30 -> elapsed 30s = 0.5min; 25 correct chars = 5 words -> 10 wpm
    const result = calculateStats(25, 5, 60, 30);
    expect(result.wpm).toBe(10);
    expect(result.accuracy).toBe(83); // 25/30 -> 83.33 -> 83
  });

  it('suppresses wpm spikes before 3 seconds have elapsed', () => {
    const result = calculateStats(20, 0, 60, 58); // elapsed = 2s
    expect(result.wpm).toBe(0);
  });

  it('reports wpm once elapsed hits exactly 3 seconds', () => {
    const result = calculateStats(1, 0, 60, 57); // elapsed = 3s
    expect(result.wpm).toBeGreaterThan(0);
  });

  it('returns 100% accuracy with no chars typed', () => {
    const result = calculateStats(0, 0, 60, 60);
    expect(result.accuracy).toBe(100);
  });
});

describe('generateRandomWords', () => {
  it('returns empty array for empty pool', () => {
    expect(generateRandomWords([], 30)).toEqual([]);
  });

  it('defaults to a batch of 200 words', () => {
    const words = generateRandomWords(['a', 'b', 'c'], 30);
    expect(words).toHaveLength(200);
  });

  it('respects a custom count', () => {
    const words = generateRandomWords(['a', 'b', 'c'], 30, 10);
    expect(words).toHaveLength(10);
  });

  it('only draws words from the given pool', () => {
    const pool = ['cat', 'dog', 'fish'];
    const words = generateRandomWords(pool, 30, 20);
    for (const w of words) {
      expect(pool).toContain(w);
    }
  });
});
