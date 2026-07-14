import { describe, expect, it } from 'vitest';
import { calculateNewElo, getExpectedScore, getKFactor } from './elo';

describe('getKFactor', () => {
  it('uses 32 for new players (< 30 matches)', () => {
    expect(getKFactor(0)).toBe(32);
    expect(getKFactor(29)).toBe(32);
  });

  it('uses 24 for intermediate players (30-99 matches)', () => {
    expect(getKFactor(30)).toBe(24);
    expect(getKFactor(99)).toBe(24);
  });

  it('uses 16 for experienced players (100+ matches)', () => {
    expect(getKFactor(100)).toBe(16);
    expect(getKFactor(500)).toBe(16);
  });
});

describe('getExpectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(getExpectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });

  it('returns a low score for a big underdog', () => {
    expect(getExpectedScore(1000, 1500)).toBeCloseTo(0.05, 2);
  });

  it('returns a high score for a big favorite', () => {
    expect(getExpectedScore(1500, 1000)).toBeCloseTo(0.95, 2);
  });
});

describe('calculateNewElo (docs/ELO_SYSTEM.md worked examples)', () => {
  it('equal players (1000 vs 1000, new players): winner +16, loser -16', () => {
    expect(calculateNewElo(1000, 1000, 'win', 0)).toBe(1016);
    expect(calculateNewElo(1000, 1000, 'loss', 0)).toBe(984);
  });

  it('upset (1000 vs 1500, new players): underdog win gains +30', () => {
    expect(calculateNewElo(1000, 1500, 'win', 0)).toBe(1030);
  });

  it('expected result (1500 vs 1000, intermediate): favorite win gains +1', () => {
    expect(calculateNewElo(1500, 1000, 'win', 30)).toBe(1501);
  });

  it('draw (1200 vs 1300, intermediate players): +3 / -3', () => {
    expect(calculateNewElo(1200, 1300, 'draw', 30)).toBe(1203);
    expect(calculateNewElo(1300, 1200, 'draw', 30)).toBe(1297);
  });
});
