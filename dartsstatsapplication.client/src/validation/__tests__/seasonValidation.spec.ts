import { describe, expect, it } from 'vitest'
import { validateNewSeason, hasErrors, SEASON_NAME_MAX_LENGTH, type NewSeasonInput } from '../seasonValidation'

function validInput(overrides: Partial<NewSeasonInput> = {}): NewSeasonInput {
  return {
    name: '2026 Summer Season',
    leagueId: 'league-1',
    teamId: 'team-1',
    ...overrides,
  }
}

describe('validateNewSeason', () => {
  it('returns no errors for valid input', () => {
    const errors = validateNewSeason(validInput())
    expect(hasErrors(errors)).toBe(false)
  })

  it.each(['', '   '])('flags a blank name (%p)', (name) => {
    const errors = validateNewSeason(validInput({ name }))
    expect(errors.name).toBe('Name is required')
  })

  it('flags a name over the max length', () => {
    const errors = validateNewSeason(validInput({ name: 'a'.repeat(SEASON_NAME_MAX_LENGTH + 1) }))
    expect(errors.name).toBe(`Name must be ${SEASON_NAME_MAX_LENGTH} characters or fewer`)
  })

  it('flags a missing league', () => {
    const errors = validateNewSeason(validInput({ leagueId: '' }))
    expect(errors.leagueId).toBe('League is required')
  })

  it('flags a missing team', () => {
    const errors = validateNewSeason(validInput({ teamId: '' }))
    expect(errors.teamId).toBe('Team is required')
  })

  it('reports every failing field at once, not just the first', () => {
    const errors = validateNewSeason({ name: '', leagueId: '', teamId: '' })
    expect(errors.name).toBeDefined()
    expect(errors.leagueId).toBeDefined()
    expect(errors.teamId).toBeDefined()
  })
})
