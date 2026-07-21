import { describe, expect, it } from 'vitest'
import { validateNewLeague, hasErrors, LEAGUE_NAME_MAX_LENGTH, type NewLeagueInput } from '../leagueValidation'

function validInput(overrides: Partial<NewLeagueInput> = {}): NewLeagueInput {
  return {
    name: 'Premier Division',
    numTrebles: 2,
    numDoubles: 3,
    numSingles: 6,
    treblesLegs: 1,
    doublesLegs: 1,
    singlesLegs: 3,
    treblesStartScore: 701,
    doublesStartScore: 601,
    singlesStartScore: 501,
    maxRounds: null,
    ...overrides,
  }
}

describe('validateNewLeague', () => {
  it('returns no errors for valid input', () => {
    const errors = validateNewLeague(validInput())
    expect(hasErrors(errors)).toBe(false)
  })

  it('accepts a configured maxRounds', () => {
    const errors = validateNewLeague(validInput({ maxRounds: 17 }))
    expect(hasErrors(errors)).toBe(false)
  })

  it.each(['', '   '])('flags a blank name (%p)', (name) => {
    const errors = validateNewLeague(validInput({ name }))
    expect(errors.name).toBe('Name is required')
  })

  it('flags a name over the max length', () => {
    const errors = validateNewLeague(validInput({ name: 'a'.repeat(LEAGUE_NAME_MAX_LENGTH + 1) }))
    expect(errors.name).toBe(`Name must be ${LEAGUE_NAME_MAX_LENGTH} characters or fewer`)
  })

  it('flags negative game counts', () => {
    const errors = validateNewLeague(validInput({ numSingles: -1 }))
    expect(errors.gameCounts).toBeDefined()
  })

  it('flags all game counts being zero', () => {
    const errors = validateNewLeague(validInput({ numTrebles: 0, numDoubles: 0, numSingles: 0 }))
    expect(errors.gameCounts).toBeDefined()
  })

  it('accepts a single non-zero game count', () => {
    const errors = validateNewLeague(validInput({ numTrebles: 0, numDoubles: 0, numSingles: 6 }))
    expect(errors.gameCounts).toBeUndefined()
  })

  it('flags a leg count below 1', () => {
    const errors = validateNewLeague(validInput({ singlesLegs: 0 }))
    expect(errors.legCounts).toBeDefined()
  })

  it('flags a starting score below 1', () => {
    const errors = validateNewLeague(validInput({ doublesStartScore: 0 }))
    expect(errors.startScores).toBeDefined()
  })

  it('flags a maxRounds below 1 when set', () => {
    const errors = validateNewLeague(validInput({ maxRounds: 0 }))
    expect(errors.maxRounds).toBeDefined()
  })

  it('reports every failing field at once, not just the first', () => {
    const errors = validateNewLeague({
      name: '',
      numTrebles: 0, numDoubles: 0, numSingles: 0,
      treblesLegs: 0, doublesLegs: 0, singlesLegs: 0,
      treblesStartScore: 0, doublesStartScore: 0, singlesStartScore: 0,
      maxRounds: 0,
    })
    expect(errors.name).toBeDefined()
    expect(errors.gameCounts).toBeDefined()
    expect(errors.legCounts).toBeDefined()
    expect(errors.startScores).toBeDefined()
    expect(errors.maxRounds).toBeDefined()
  })
})
