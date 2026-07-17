// Mirrors DartsStatsApplication.Server/Services/Validators/PlayerControllerValidator.cs -
// this is a client-side convenience for instant feedback, not a substitute for the
// server's own check (which is what's actually authoritative).
export const PLAYER_NAME_MAX_LENGTH = 100

/** Returns an error message if the name is invalid, or null if it's fine. */
export function validatePlayerName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'Name is required'
  }

  if (trimmed.length > PLAYER_NAME_MAX_LENGTH) {
    return `Name must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer`
  }

  return null
}
