import { describe, expect, it } from 'vitest'
import { isValidDartScore, isValidCheckoutScore } from '../dartScoring'

describe('isValidDartScore', () => {
  it('accepts 0 (a bust/no-score) and the maximum possible visit, 180 (T20, T20, T20)', () => {
    expect(isValidDartScore(0)).toBe(true)
    expect(isValidDartScore(180)).toBe(true)
  })

  it('accepts every single-dart segment value', () => {
    // Singles 1-20, single bull.
    for (let i = 1; i <= 20; i++) expect(isValidDartScore(i)).toBe(true)
    expect(isValidDartScore(25)).toBe(true)
    // A couple of trebles/doubles picked at random.
    expect(isValidDartScore(60)).toBe(true) // T20
    expect(isValidDartScore(50)).toBe(true) // double bull
    expect(isValidDartScore(40)).toBe(true) // D20
  })

  it('rejects the 9 scores that are famously impossible with 3 darts', () => {
    // A well-known darts fact, and exactly what buildAchievable computes from
    // first principles - see models/dartScoring.ts's header comment.
    const impossible = [163, 166, 169, 172, 173, 175, 176, 178, 179]
    for (const score of impossible) {
      expect(isValidDartScore(score)).toBe(false)
    }
  })

  it('accepts every other score from 0 to 180', () => {
    const impossible = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179])
    for (let score = 0; score <= 180; score++) {
      if (impossible.has(score)) continue
      expect(isValidDartScore(score)).toBe(true)
    }
  })

  it('rejects anything above 180 or below 0', () => {
    expect(isValidDartScore(181)).toBe(false)
    expect(isValidDartScore(-1)).toBe(false)
  })

  it('rejects non-integers', () => {
    expect(isValidDartScore(60.5)).toBe(false)
  })
})

describe('isValidCheckoutScore', () => {
  it('accepts 170, the highest possible checkout (T20, T20, Bull)', () => {
    expect(isValidCheckoutScore(170)).toBe(true)
  })

  it('rejects 180 - the highest possible score, but not a valid checkout (no double leaves 0 after it)', () => {
    expect(isValidDartScore(180)).toBe(true)
    expect(isValidCheckoutScore(180)).toBe(false)
  })

  it('accepts every double on its own: 2-40 even, and 50 (double bull)', () => {
    for (let i = 2; i <= 40; i += 2) expect(isValidCheckoutScore(i)).toBe(true)
    expect(isValidCheckoutScore(50)).toBe(true)
  })

  it('rejects 1 - a valid score (single 1) but impossible to check out on, since no double scores 1', () => {
    expect(isValidDartScore(1)).toBe(true)
    expect(isValidCheckoutScore(1)).toBe(false)
  })

  it('rejects odd numbers that have no double-ending combination: 159, 162, 165, 168', () => {
    // Each of these is a legal 3-dart total (isValidDartScore is true), but
    // none of them can be split so the last dart is a double.
    for (const score of [159, 162, 165, 168]) {
      expect(isValidDartScore(score)).toBe(true)
      expect(isValidCheckoutScore(score)).toBe(false)
    }
  })

  it('rejects every score that is not achievable at all', () => {
    for (const score of [163, 166, 169, 172, 179]) {
      expect(isValidCheckoutScore(score)).toBe(false)
    }
  })

  it('accepts 121 (e.g. T17, D15, D20)', () => {
    expect(isValidCheckoutScore(121)).toBe(true)
  })

  it('rejects anything above 170 or below 2', () => {
    expect(isValidCheckoutScore(171)).toBe(false)
    expect(isValidCheckoutScore(1)).toBe(false)
    expect(isValidCheckoutScore(0)).toBe(false)
  })
})
