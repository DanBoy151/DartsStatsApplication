import { describe, expect, it } from 'vitest'
import { formatDisplayDate, toDateInputValue } from '../dateFormat'

describe('formatDisplayDate', () => {
  it('formats a Date as "DD Month YYYY"', () => {
    expect(formatDisplayDate(new Date(2026, 7, 5))).toBe('05 August 2026')
  })

  it('formats an ISO date string the same way', () => {
    expect(formatDisplayDate('2026-08-05')).toBe('05 August 2026')
  })

  it('pads single-digit days', () => {
    expect(formatDisplayDate(new Date(2026, 0, 1))).toBe('01 January 2026')
  })

  it.each([undefined, null, ''])('returns empty string for %p', (value) => {
    expect(formatDisplayDate(value)).toBe('')
  })

  it('falls back to the original string for an unparseable date string', () => {
    expect(formatDisplayDate('not a date')).toBe('not a date')
  })
})

describe('toDateInputValue', () => {
  it('formats a Date as yyyy-mm-dd', () => {
    expect(toDateInputValue(new Date(2026, 7, 5))).toBe('2026-08-05')
  })

  it('pads single-digit months and days', () => {
    expect(toDateInputValue(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('returns empty string for an invalid date', () => {
    expect(toDateInputValue(new Date('not a date'))).toBe('')
  })
})
