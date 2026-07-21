import { describe, expect, it } from 'vitest'
import { validateTeamName, TEAM_NAME_MAX_LENGTH } from '../teamValidation'

describe('validateTeamName', () => {
  it('returns null for a valid name', () => {
    expect(validateTeamName('The Rovers')).toBeNull()
  })

  it.each(['', '   '])('flags a blank name (%p)', (name) => {
    expect(validateTeamName(name)).toBe('Name is required')
  })

  it('flags a name over the max length', () => {
    const name = 'a'.repeat(TEAM_NAME_MAX_LENGTH + 1)
    expect(validateTeamName(name)).toBe(`Name must be ${TEAM_NAME_MAX_LENGTH} characters or fewer`)
  })

  it('accepts a name at the max length', () => {
    const name = 'a'.repeat(TEAM_NAME_MAX_LENGTH)
    expect(validateTeamName(name)).toBeNull()
  })
})
