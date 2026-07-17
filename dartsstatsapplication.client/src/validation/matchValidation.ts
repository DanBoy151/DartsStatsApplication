// Mirrors DartsStatsApplication.Server/Services/Validators/MatchControllerValidator.ValidateNewMatch -
// this is a client-side convenience for instant feedback, not a substitute for the
// server's own check (which is what's actually authoritative).
export const MATCH_OPPONENT_MAX_LENGTH = 200

export interface NewMatchInput {
  opponent: string
  date: string // yyyy-mm-dd, from <input type="date">
  location: string
}

export interface NewMatchErrors {
  opponent?: string
  date?: string
  location?: string
}

export function validateNewMatch(input: NewMatchInput): NewMatchErrors {
  const errors: NewMatchErrors = {}

  const opponent = input.opponent.trim()
  if (!opponent) {
    errors.opponent = 'Opponent is required'
  } else if (opponent.length > MATCH_OPPONENT_MAX_LENGTH) {
    errors.opponent = `Opponent must be ${MATCH_OPPONENT_MAX_LENGTH} characters or fewer`
  }

  if (!input.date) {
    errors.date = 'Date is required'
  }

  if (input.location !== 'Home' && input.location !== 'Away') {
    errors.location = 'Location is required'
  }

  return errors
}

export function hasErrors(errors: NewMatchErrors): boolean {
  return Object.keys(errors).length > 0
}
