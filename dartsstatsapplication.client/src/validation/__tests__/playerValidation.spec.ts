import { describe, expect, it } from 'vitest'
import { validatePlayerName, PLAYER_NAME_MAX_LENGTH } from '../playerValidation'

describe('validatePlayerName', () => {
  it('accepts a normal name', () => {
    expect(validatePlayerName('Alice')).toBeNull()
  })

  it.each(['', '   ', '\t\n'])('rejects blank input %p', (name) => {
    expect(validatePlayerName(name)).toBe('Name is required')
  })

  it('accepts a name at the max length', () => {
    expect(validatePlayerName('a'.repeat(PLAYER_NAME_MAX_LENGTH))).toBeNull()
  })

  it('rejects a name over the max length', () => {
    expect(validatePlayerName('a'.repeat(PLAYER_NAME_MAX_LENGTH + 1))).toBe(
      `Name must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer`
    )
  })

  it('is based on the trimmed length, not the raw length', () => {
    const padded = `  ${'a'.repeat(PLAYER_NAME_MAX_LENGTH)}  `
    expect(validatePlayerName(padded)).toBeNull()
  })
})
