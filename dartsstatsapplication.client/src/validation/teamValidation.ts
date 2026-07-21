// Mirrors DartsStatsApplication.Server/Services/Validators/TeamControllerValidator.ValidateName -
// this is a client-side convenience for instant feedback, not a substitute for the
// server's own check (which is what's actually authoritative).
export const TEAM_NAME_MAX_LENGTH = 150

/** Returns an error message if the name is invalid, or null if it's fine. */
export function validateTeamName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'Name is required'
  }

  if (trimmed.length > TEAM_NAME_MAX_LENGTH) {
    return `Name must be ${TEAM_NAME_MAX_LENGTH} characters or fewer`
  }

  return null
}
