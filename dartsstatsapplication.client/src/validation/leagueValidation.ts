// Mirrors DartsStatsApplication.Server/Services/Validators/LeagueControllerValidator.ValidateLeague -
// this is a client-side convenience for instant feedback, not a substitute for the
// server's own check (which is what's actually authoritative).
export const LEAGUE_NAME_MAX_LENGTH = 150

export interface NewLeagueInput {
  name: string
  numTrebles: number
  numDoubles: number
  numSingles: number
  treblesLegs: number
  doublesLegs: number
  singlesLegs: number
  treblesStartScore: number
  doublesStartScore: number
  singlesStartScore: number
  maxRounds: number | null
}

export interface NewLeagueErrors {
  name?: string
  gameCounts?: string
  legCounts?: string
  startScores?: string
  maxRounds?: string
}

export function validateNewLeague(input: NewLeagueInput): NewLeagueErrors {
  const errors: NewLeagueErrors = {}

  const name = input.name.trim()
  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length > LEAGUE_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${LEAGUE_NAME_MAX_LENGTH} characters or fewer`
  }

  const gameCounts = [input.numTrebles, input.numDoubles, input.numSingles]
  if (gameCounts.some((c) => c < 0) || gameCounts.every((c) => c === 0)) {
    errors.gameCounts = 'Game counts must be 0 or more, and at least one game type must be non-zero'
  }

  const legCounts = [input.treblesLegs, input.doublesLegs, input.singlesLegs]
  if (legCounts.some((c) => c < 1)) {
    errors.legCounts = 'Leg counts must be 1 or more'
  }

  const startScores = [input.treblesStartScore, input.doublesStartScore, input.singlesStartScore]
  if (startScores.some((s) => s < 1)) {
    errors.startScores = 'Starting scores must be 1 or more'
  }

  if (input.maxRounds != null && input.maxRounds < 1) {
    errors.maxRounds = 'Max rounds must be 1 or more, or left blank for no limit'
  }

  return errors
}

export function hasErrors(errors: NewLeagueErrors): boolean {
  return Object.keys(errors).length > 0
}
