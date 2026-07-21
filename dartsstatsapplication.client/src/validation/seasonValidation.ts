// Mirrors DartsStatsApplication.Server/Services/Validators/SeasonControllerValidator.ValidateNewSeason -
// this is a client-side convenience for instant feedback, not a substitute for the
// server's own check (which is what's actually authoritative).
export const SEASON_NAME_MAX_LENGTH = 150

export interface NewSeasonInput {
  name: string
  leagueId: string
  teamId: string
}

export interface NewSeasonErrors {
  name?: string
  leagueId?: string
  teamId?: string
}

export function validateNewSeason(input: NewSeasonInput): NewSeasonErrors {
  const errors: NewSeasonErrors = {}

  const name = input.name.trim()
  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length > SEASON_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${SEASON_NAME_MAX_LENGTH} characters or fewer`
  }

  if (!input.leagueId) {
    errors.leagueId = 'League is required'
  }

  if (!input.teamId) {
    errors.teamId = 'Team is required'
  }

  return errors
}

export function hasErrors(errors: NewSeasonErrors): boolean {
  return Object.keys(errors).length > 0
}
