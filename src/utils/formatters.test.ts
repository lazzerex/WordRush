import { describe, expect, it } from 'vitest'
import {
  getAccuracyColorClass,
  getAccuracyRating,
  getWpmColorClass,
  getWpmRating,
} from './formatters'

describe('getWpmRating', () => {
  it.each([
    [0, 'Novice'],
    [39, 'Novice'],
    [40, 'Beginner'],
    [59, 'Beginner'],
    [60, 'Intermediate'],
    [79, 'Intermediate'],
    [80, 'Advanced'],
    [99, 'Advanced'],
    [100, 'Expert'],
    [150, 'Expert'],
  ])('rates %i wpm as %s', (wpm, expected) => {
    expect(getWpmRating(wpm)).toBe(expected)
  })
})

describe('getAccuracyRating', () => {
  it.each([
    [0, 'Needs Work'],
    [69, 'Needs Work'],
    [70, 'Fair'],
    [79, 'Fair'],
    [80, 'Good'],
    [89, 'Good'],
    [90, 'Great'],
    [94, 'Great'],
    [95, 'Excellent'],
    [100, 'Excellent'],
  ])('rates %i%% accuracy as %s', (accuracy, expected) => {
    expect(getAccuracyRating(accuracy)).toBe(expected)
  })
})

describe('getWpmColorClass', () => {
  it.each([
    [0, 'text-zinc-400'],
    [39, 'text-zinc-400'],
    [40, 'text-blue-400'],
    [59, 'text-blue-400'],
    [60, 'text-green-400'],
    [79, 'text-green-400'],
    [80, 'text-yellow-400'],
  ])('colors %i wpm as %s', (wpm, expected) => {
    expect(getWpmColorClass(wpm)).toBe(expected)
  })
})

describe('getAccuracyColorClass', () => {
  it.each([
    [0, 'text-red-400'],
    [74, 'text-red-400'],
    [75, 'text-orange-400'],
    [84, 'text-orange-400'],
    [85, 'text-blue-400'],
    [94, 'text-blue-400'],
    [95, 'text-green-400'],
  ])('colors %i%% accuracy as %s', (accuracy, expected) => {
    expect(getAccuracyColorClass(accuracy)).toBe(expected)
  })
})
