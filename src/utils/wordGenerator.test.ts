import { describe, expect, it } from 'vitest'
import { generateRandomWords, shuffleArray } from './wordGenerator'

describe('shuffleArray', () => {
  it('preserves length and element set', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffleArray(input)
    expect(input).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([])
  })

  it('handles single-element array', () => {
    expect(shuffleArray([1])).toEqual([1])
  })
})

describe('generateRandomWords', () => {
  it('returns empty array for empty pool', () => {
    expect(generateRandomWords([], 30)).toEqual([])
  })

  it('returns empty array for null/undefined pool', () => {
    // @ts-expect-error testing defensive guard against bad input
    expect(generateRandomWords(null, 30)).toEqual([])
  })

  it('only draws words from the given pool', () => {
    const pool = ['cat', 'dog', 'fish']
    const words = generateRandomWords(pool, 30)
    for (const w of words) {
      expect(pool).toContain(w)
    }
  })

  it('generates more words for longer durations', () => {
    const pool = Array.from({ length: 500 }, (_, i) => `word${i}`)
    const short = generateRandomWords(pool, 15)
    const long = generateRandomWords(pool, 120)
    expect(long.length).toBeGreaterThan(short.length)
  })

  it('respects a configured minimum word count even for tiny durations', () => {
    const pool = Array.from({ length: 500 }, (_, i) => `word${i}`)
    const words = generateRandomWords(pool, 1)
    expect(words.length).toBeGreaterThan(0)
  })
})
