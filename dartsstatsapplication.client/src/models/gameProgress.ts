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
  /** 1-based - every player throws once per round, in playerOrder, so round
   *  = floor(throw index / player count) + 1. Resets each leg, since throws
   *  are already scoped to a single leg's score history. */
  round: number
}

export function buildLedgerRows(throws: LedgerThrow[], startingScore: number, playerOrder: string[]): LedgerRow[] {
  let remaining = startingScore
  const playersPerRound = Math.max(playerOrder.length, 1)
  return throws.map((t, index) => {
    remaining -= t.score
    return {
      playerId: t.playerId,
      score: t.score,
      remaining,
      playerIndex: playerOrder.indexOf(t.playerId),
      isMaximum: t.score === 180,
      isNoScore: t.score === 0,
      round: Math.floor(index / playersPerRound) + 1,
    }
  })
}

export interface VisitStats {
  /** null when there are no throws yet - distinct from a real 0.0 average. */
  average: number | null
  highest: number
  visits: number
  /** Non-overlapping score tiers, matching how broadcast darts stats are
   *  usually shown: 100-139, 140-179, and exactly 180 each count once. */
  tier100: number
  tier140: number
  tier180: number
}

export function computeVisitStats(throws: LedgerThrow[]): VisitStats {
  if (throws.length === 0) {
    return { average: null, highest: 0, visits: 0, tier100: 0, tier140: 0, tier180: 0 }
  }

  let total = 0
  let highest = 0
  let tier100 = 0
  let tier140 = 0
  let tier180 = 0

  for (const t of throws) {
    total += t.score
    if (t.score > highest) highest = t.score
    if (t.score === 180) tier180++
    else if (t.score >= 140) tier140++
    else if (t.score >= 100) tier100++
  }

  return { average: total / throws.length, highest, visits: throws.length, tier100, tier140, tier180 }
}

export interface PlayerAverage {
  playerId: string
  /** Index within playerOrder - used for the same stable per-player colour ScoreLedgerPanel uses, not a ranking. */
  playerIndex: number
  /** null when this player hasn't thrown yet. */
  average: number | null
}

/** One row per player in playerOrder, even if they haven't thrown yet - for Doubles/Trebles, where a shared leg total can't be split back out by player any other way. */
export function computePlayerAverages(throws: LedgerThrow[], playerOrder: string[]): PlayerAverage[] {
  return playerOrder.map((playerId, playerIndex) => {
    const playerThrows = throws.filter((t) => t.playerId === playerId)
    const average = playerThrows.length === 0 ? null : playerThrows.reduce((sum, t) => sum + t.score, 0) / playerThrows.length
    return { playerId, playerIndex, average }
  })
}

export interface LegSummary {
  order: number
  status: string
  result: string
  score: LedgerThrow[]
}

export interface LegAverage {
  order: number
  /** null when the leg hasn't been played (Pending) yet. */
  average: number | null
  result: 'won' | 'lost' | 'live' | 'pending'
}

/**
 * One row per leg, in order - for Singles, where the leg-by-leg breakdown
 * also has to say where in the best-of-three you are, since there's no
 * separate leg counter doing that job.
 */
export function computeLegAverages(legs: LegSummary[]): LegAverage[] {
  return [...legs]
    .sort((a, b) => a.order - b.order)
    .map((leg) => {
      const stats = computeVisitStats(leg.score)
      const result: LegAverage['result'] =
        leg.status === 'Completed' ? (leg.result === 'Win' ? 'won' : 'lost') : leg.status === 'Started' ? 'live' : 'pending'
      return { order: leg.order, average: stats.average, result }
    })
}

/**
 * Pads a leg-average list with pending placeholders up to however many legs
 * the game type has - for when game.legs hasn't loaded yet (e.g. before a
 * Singles game has even been started), so the leg-averages list still shows
 * all 3 rows rather than none.
 */
export function padLegAverages(averages: LegAverage[], gameType: string): LegAverage[] {
  const total = totalLegsForGameType(gameType)
  if (averages.length >= total) return averages

  const padded = [...averages]
  for (let i = averages.length; i < total; i++) {
    padded.push({ order: i, average: null, result: 'pending' })
  }
  return padded
}
