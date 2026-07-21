import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDisplayDate, toDateInputValue, isTodayOrPastAEST } from '../dateFormat'

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

describe('isTodayOrPastAEST', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a date far in the past', () => {
    expect(isTodayOrPastAEST(new Date('2000-01-01T00:00:00Z'))).toBe(true)
  })

  it('returns false for a date far in the future', () => {
    expect(isTodayOrPastAEST(new Date('2100-01-01T00:00:00Z'))).toBe(false)
  })

  it('returns false for an invalid date', () => {
    expect(isTodayOrPastAEST(new Date('not a date'))).toBe(false)
  })

  it('treats a match date-only string ("yyyy-mm-dd", parsed as UTC midnight) as today when it is already today in AEST, even while UTC is still on the previous calendar day', () => {
    // 2026-01-01T20:00:00Z is 2026-01-02 06:00 in AEST (UTC+10) - "today" in
    // AEST is already the 2nd, despite the UTC calendar date still reading
    // the 1st.
    vi.setSystemTime(new Date('2026-01-01T20:00:00Z'))
    expect(isTodayOrPastAEST(new Date('2026-01-02'))).toBe(true)
    expect(isTodayOrPastAEST(new Date('2026-01-03'))).toBe(false)
  })
})
