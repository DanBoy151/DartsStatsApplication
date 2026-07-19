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

// Leg starting scores per game type - mirrors GameService.CreatePendingLegs.
const STARTING_SCORE: Record<string, number> = {
  singles: 501,
  single: 501,
  doubles: 601,
  double: 601,
  trebles: 701,
  treble: 701,
}

export function startingScoreForGameType(gameType: string): number {
  return STARTING_SCORE[gameType.toLowerCase()] ?? 0
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

export interface LedgerThrow {
  playerId: string
  score: number
}

export interface LedgerRow {
  playerId: string
  score: number
  /** The leg's remaining score after this throw - legs count down from one
   *  shared total, not a separate one per player (Doubles/Trebles partners
   *  take turns against the same countdown). */
  remaining: number
  /** Index of playerId within the game's player order, or -1 if not found -
   *  used to assign a stable per-player colour, not a ranking. */
  playerIndex: number
  isMaximum: boolean
  /** A recorded 0 - almost always a bust (EnterScorePanel's "No Score" path
   *  records exactly this), occasionally a genuine scoreless visit. The
   *  data doesn't distinguish the two, so both render the same way. */
  isNoScore: boolean
}

export function buildLedgerRows(throws: LedgerThrow[], startingScore: number, playerOrder: string[]): LedgerRow[] {
  let remaining = startingScore
  return throws.map((t) => {
    remaining -= t.score
    return {
      playerId: t.playerId,
      score: t.score,
      remaining,
      playerIndex: playerOrder.indexOf(t.playerId),
      isMaximum: t.score === 180,
      isNoScore: t.score === 0,
    }
  })
}
