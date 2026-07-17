import { describe, expect, it } from 'vitest'
import { validateNewMatch, hasErrors, MATCH_OPPONENT_MAX_LENGTH, type NewMatchInput } from '../matchValidation'

function validInput(overrides: Partial<NewMatchInput> = {}): NewMatchInput {
  return {
    opponent: 'The Rovers',
    date: '2026-08-01',
    location: 'Home',
    ...overrides,
  }
}

describe('validateNewMatch', () => {
  it('returns no errors for valid input', () => {
    const errors = validateNewMatch(validInput())
    expect(hasErrors(errors)).toBe(false)
  })

  it.each(['', '   '])('flags a blank opponent (%p)', (opponent) => {
    const errors = validateNewMatch(validInput({ opponent }))
    expect(errors.opponent).toBe('Opponent is required')
  })

  it('flags an opponent over the max length', () => {
    const errors = validateNewMatch(validInput({ opponent: 'a'.repeat(MATCH_OPPONENT_MAX_LENGTH + 1) }))
    expect(errors.opponent).toBe(`Opponent must be ${MATCH_OPPONENT_MAX_LENGTH} characters or fewer`)
  })

  it('accepts an opponent at the max length', () => {
    const errors = validateNewMatch(validInput({ opponent: 'a'.repeat(MATCH_OPPONENT_MAX_LENGTH) }))
    expect(errors.opponent).toBeUndefined()
  })

  it('flags a missing date', () => {
    const errors = validateNewMatch(validInput({ date: '' }))
    expect(errors.date).toBe('Date is required')
  })

  it('flags a missing/invalid location', () => {
    const errors = validateNewMatch(validInput({ location: '' }))
    expect(errors.location).toBe('Location is required')
  })

  it('accepts Away as a location', () => {
    const errors = validateNewMatch(validInput({ location: 'Away' }))
    expect(errors.location).toBeUndefined()
  })

  it('reports every failing field at once, not just the first', () => {
    const errors = validateNewMatch({ opponent: '', date: '', location: '' })
    expect(errors.opponent).toBeDefined()
    expect(errors.date).toBeDefined()
    expect(errors.location).toBeDefined()
  })
})
