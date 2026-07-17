// Fixed leg counts per game type - mirrors the server's
// MatchService.CreatePendingLegs (Singles: best-of-3 legs / 501 start;
// Doubles & Trebles: single-leg / 601 & 701 start).
const TOTAL_LEGS: Record<string, number> = {
  singles: 3,
  single: 3,
  doubles: 1,
  double: 1,
  trebles: 1,
  treble: 1,
}

export function totalLegsForGameType(gameType: string): number {
  return TOTAL_LEGS[gameType.toLowerCase()] ?? 1
}

/** How many leg wins (or losses) it takes to decide the game outright. */
export function legsRequiredToWin(gameType: string): number {
  return Math.ceil(totalLegsForGameType(gameType) / 2)
}

export interface LegOutcome {
  status: string
  result: string
}

/**
 * A game is decided once either every leg has been played, or one side has
 * already won enough legs that the remaining leg(s) can't change the
 * outcome (e.g. 2-0 in a best-of-3 Singles game - the 3rd leg is
 * unnecessary). Only "Completed" legs count; a leg that's Pending or
 * Started hasn't produced a result yet.
 */
export function isGameDecided(legs: LegOutcome[], gameType: string): boolean {
  const completed = legs.filter((l) => l.status === 'Completed')
  const wins = completed.filter((l) => l.result === 'Win').length
  const losses = completed.filter((l) => l.result === 'Loss').length
  const needed = legsRequiredToWin(gameType)

  return completed.length >= totalLegsForGameType(gameType) || wins >= needed || losses >= needed
}

/**
 * The most recently played (Started or Completed) leg, by `order` - not
 * simply the highest-order leg overall, since a game decided early (e.g.
 * 2-0 in a best-of-3) leaves its last leg permanently Pending. Used to
 * decide what to show when reopening a game that's already In Progress or
 * Complete. Returns null if no leg has been touched yet.
 */
export function lastTouchedLeg<T extends { status: string; order: number }>(legs: T[]): T | null {
  return legs
    .filter((l) => l.status !== 'Pending')
    .reduce<T | null>((latest, leg) => (!latest || leg.order > latest.order ? leg : latest), null)
}
