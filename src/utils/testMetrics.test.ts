import { describe, expect, it } from 'vitest'
import {
  calculateAccuracy,
  calculateRawWPM,
  calculateTestMetrics,
  calculateWPM,
} from './testMetrics'

describe('calculateWPM', () => {
  it('computes standard 5-char-per-word WPM', () => {
    // 250 correct chars = 50 words, over 60s = 1 minute -> 50 WPM
    expect(calculateWPM(250, 60)).toBe(50)
  })

  it('rounds to nearest integer', () => {
    expect(calculateWPM(100, 60)).toBe(20)
    expect(calculateWPM(101, 60)).toBe(20) // 20.2 -> 20
    expect(calculateWPM(103, 60)).toBe(21) // 20.6 -> 21
  })

  it('scales with duration', () => {
    expect(calculateWPM(250, 30)).toBe(100) // half the time, double the rate
  })

  it('returns 0 for 0 correct chars', () => {
    expect(calculateWPM(0, 60)).toBe(0)
  })
})

describe('calculateRawWPM', () => {
  it('uses total chars including errors', () => {
    expect(calculateRawWPM(300, 60)).toBe(60)
  })
})

describe('calculateAccuracy', () => {
  it('computes percentage of correct chars', () => {
    expect(calculateAccuracy(90, 10)).toBe(90)
  })

  it('returns 100 when no chars typed', () => {
    expect(calculateAccuracy(0, 0)).toBe(100)
  })

  it('returns 0 when all chars incorrect', () => {
    expect(calculateAccuracy(0, 10)).toBe(0)
  })

  it('returns 100 when all chars correct', () => {
    expect(calculateAccuracy(50, 0)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    expect(calculateAccuracy(2, 1)).toBe(67) // 66.67 -> 67
  })
})

describe('calculateTestMetrics', () => {
  it('composes wpm, rawWpm, and accuracy', () => {
    const result = calculateTestMetrics(250, 25, 60)
    expect(result).toEqual({
      wpm: 50,
      rawWpm: 55,
      accuracy: 91,
    })
  })

  it('handles zero-char test', () => {
    const result = calculateTestMetrics(0, 0, 60)
    expect(result.wpm).toBe(0)
    expect(result.rawWpm).toBe(0)
    expect(result.accuracy).toBe(100)
  })
})
