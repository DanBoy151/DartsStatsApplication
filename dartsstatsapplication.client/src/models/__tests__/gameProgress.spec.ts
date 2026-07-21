import { describe, expect, it } from 'vitest'
import {
  totalLegsForGameType,
  legsRequiredToWin,
  isGameDecided,
  lastTouchedLeg,
  startingScoreForGameType,
  buildLedgerRows,
  computeVisitStats,
  computePlayerAverages,
  computeLegAverages,
  padLegAverages,
  nextPlayerId,
  currentRound,
  isBullOffRound,
  type LegOutcome,
} from '../gameProgress'

function leg(status: string, result: string): LegOutcome {
  return { status, result }
}

interface OrderedLeg {
  legId: string
  status: string
  order: number
}

function orderedLeg(legId: string, status: string, order: number): OrderedLeg {
  return { legId, status, order }
}

describe('totalLegsForGameType', () => {
  it('is 3 for Singles (best of 3)', () => {
    expect(totalLegsForGameType('Singles')).toBe(3)
  })

  it('is 1 for Doubles and Trebles (single leg)', () => {
    expect(totalLegsForGameType('Doubles')).toBe(1)
    expect(totalLegsForGameType('Trebles')).toBe(1)
  })

  it('is case-insensitive', () => {
    expect(totalLegsForGameType('singles')).toBe(3)
    expect(totalLegsForGameType('SINGLES')).toBe(3)
  })

  it('defaults to 1 for an unrecognised type', () => {
    expect(totalLegsForGameType('Nonsense')).toBe(1)
  })
})

describe('legsRequiredToWin', () => {
  it('is 2 for Singles (majority of 3)', () => {
    expect(legsRequiredToWin('Singles')).toBe(2)
  })

  it('is 1 for Doubles and Trebles', () => {
    expect(legsRequiredToWin('Doubles')).toBe(1)
    expect(legsRequiredToWin('Trebles')).toBe(1)
  })
})

describe('isGameDecided', () => {
  it('is not decided with no legs played yet', () => {
    expect(isGameDecided([], 'Singles')).toBe(false)
  })

  it('is not decided after a single Singles leg either way', () => {
    expect(isGameDecided([leg('Completed', 'Win')], 'Singles')).toBe(false)
    expect(isGameDecided([leg('Completed', 'Loss')], 'Singles')).toBe(false)
  })

  it('is decided once one side reaches the majority before all legs are played (2-0 in Singles)', () => {
    // Regression case for the reported requirement: mathematically
    // impossible for the other side to still win, even with a leg unplayed.
    const legs = [leg('Completed', 'Win'), leg('Completed', 'Win')]
    expect(isGameDecided(legs, 'Singles')).toBe(true)
  })

  it('is decided once all Singles legs are played, even split 2-1', () => {
    const legs = [leg('Completed', 'Win'), leg('Completed', 'Loss'), leg('Completed', 'Win')]
    expect(isGameDecided(legs, 'Singles')).toBe(true)
  })

  it('ignores legs that have not been completed yet', () => {
    const legs = [leg('Completed', 'Win'), leg('Started', ''), leg('Pending', '')]
    expect(isGameDecided(legs, 'Singles')).toBe(false)
  })

  it('is decided after the single leg for Doubles/Trebles', () => {
    expect(isGameDecided([leg('Completed', 'Win')], 'Doubles')).toBe(true)
    expect(isGameDecided([leg('Completed', 'Loss')], 'Trebles')).toBe(true)
  })

  it('prefers a legsToPlayOverride over the gameType default', () => {
    // A League-configured best-of-5 Singles game: 2-0 is not yet decided
    // (majority of 5 is 3), even though it would be for the default best-of-3.
    const legs = [leg('Completed', 'Win'), leg('Completed', 'Win')]
    expect(isGameDecided(legs, 'Singles', 5)).toBe(false)
    expect(isGameDecided([...legs, leg('Completed', 'Win')], 'Singles', 5)).toBe(true)
  })
})

describe('lastTouchedLeg', () => {
  it('returns null when nothing has been played yet', () => {
    const legs = [orderedLeg('a', 'Pending', 0), orderedLeg('b', 'Pending', 1)]
    expect(lastTouchedLeg(legs)).toBeNull()
  })

  it('returns the currently Started leg while a game is in progress', () => {
    const legs = [orderedLeg('a', 'Completed', 0), orderedLeg('b', 'Started', 1), orderedLeg('c', 'Pending', 2)]
    expect(lastTouchedLeg(legs)?.legId).toBe('b')
  })

  it('returns the final leg played when all legs are complete', () => {
    const legs = [orderedLeg('a', 'Completed', 0), orderedLeg('b', 'Completed', 1), orderedLeg('c', 'Completed', 2)]
    expect(lastTouchedLeg(legs)?.legId).toBe('c')
  })

  it('skips a permanently-Pending leg left over from a game decided early (2-0)', () => {
    // Regression case: leg 3's order (2) is higher than leg 2's (1), but leg
    // 3 was never played - the highest-order leg is not necessarily the
    // last *touched* one.
    const legs = [orderedLeg('a', 'Completed', 0), orderedLeg('b', 'Completed', 1), orderedLeg('c', 'Pending', 2)]
    expect(lastTouchedLeg(legs)?.legId).toBe('b')
  })

  it('is order-independent in the input array', () => {
    const legs = [orderedLeg('c', 'Pending', 2), orderedLeg('a', 'Completed', 0), orderedLeg('b', 'Completed', 1)]
    expect(lastTouchedLeg(legs)?.legId).toBe('b')
  })
})

describe('startingScoreForGameType', () => {
  it('is 501 for Singles, 601 for Doubles, 701 for Trebles', () => {
    expect(startingScoreForGameType('Singles')).toBe(501)
    expect(startingScoreForGameType('Doubles')).toBe(601)
    expect(startingScoreForGameType('Trebles')).toBe(701)
  })

  it('is case-insensitive', () => {
    expect(startingScoreForGameType('trebles')).toBe(701)
  })

  it('defaults to 0 for an unrecognised type', () => {
    expect(startingScoreForGameType('Nonsense')).toBe(0)
  })
})

describe('buildLedgerRows', () => {
  it('carries a running remaining down from the starting score, shared across players', () => {
    const throws = [
      { playerId: 'tweedie', score: 60 },
      { playerId: 'gary', score: 26 },
      { playerId: 'dave-s', score: 180 },
    ]

    const rows = buildLedgerRows(throws, 701, ['tweedie', 'gary', 'dave-s'])

    expect(rows.map((r) => r.remaining)).toEqual([641, 615, 435])
  })

  it('flags a 180 as a maximum', () => {
    const rows = buildLedgerRows([{ playerId: 'p1', score: 180 }], 701, ['p1'])
    expect(rows[0]?.isMaximum).toBe(true)
    expect(rows[0]?.isNoScore).toBe(false)
  })

  it('flags a recorded 0 as a no-score, leaving remaining unchanged', () => {
    const throws = [
      { playerId: 'p1', score: 100 },
      { playerId: 'p1', score: 0 },
    ]
    const rows = buildLedgerRows(throws, 501, ['p1'])
    expect(rows[1]?.isNoScore).toBe(true)
    expect(rows[1]?.isMaximum).toBe(false)
    expect(rows[1]?.remaining).toBe(401)
  })

  it('resolves playerIndex from the supplied player order, or -1 if not found', () => {
    const throws = [
      { playerId: 'gary', score: 45 },
      { playerId: 'unknown', score: 20 },
    ]
    const rows = buildLedgerRows(throws, 501, ['tweedie', 'gary', 'dave-s'])
    expect(rows[0]?.playerIndex).toBe(1)
    expect(rows[1]?.playerIndex).toBe(-1)
  })

  it('returns an empty array for a leg with no throws yet', () => {
    expect(buildLedgerRows([], 501, ['p1'])).toEqual([])
  })

  it('numbers rounds by player rotation, one throw per player per round', () => {
    // 3 players -> rounds of 3: throws 0-2 are round 1, 3-5 are round 2, etc.
    const throws = Array.from({ length: 7 }, (_, i) => ({ playerId: `p${i % 3}`, score: 20 }))
    const rows = buildLedgerRows(throws, 701, ['p0', 'p1', 'p2'])
    expect(rows.map((r) => r.round)).toEqual([1, 1, 1, 2, 2, 2, 3])
  })

  it('numbers every throw as its own round for a single-player (Singles) leg', () => {
    const throws = [{ playerId: 'p1', score: 60 }, { playerId: 'p1', score: 45 }]
    const rows = buildLedgerRows(throws, 501, ['p1'])
    expect(rows.map((r) => r.round)).toEqual([1, 2])
  })

  it('does not divide by zero when playerOrder is empty', () => {
    const rows = buildLedgerRows([{ playerId: 'p1', score: 20 }], 501, [])
    expect(rows[0]?.round).toBe(1)
  })
})

describe('computeVisitStats', () => {
  it('returns a null average (not 0) with no throws yet', () => {
    const stats = computeVisitStats([])
    expect(stats).toEqual({ average: null, highest: 0, visits: 0, tier100: 0, tier140: 0, tier180: 0 })
  })

  it('computes average, highest, and visits', () => {
    const throws = [{ playerId: 'p1', score: 60 }, { playerId: 'p1', score: 45 }, { playerId: 'p1', score: 100 }]
    const stats = computeVisitStats(throws)
    expect(stats.average).toBeCloseTo(68.33, 2)
    expect(stats.highest).toBe(100)
    expect(stats.visits).toBe(3)
  })

  it('buckets tiers as non-overlapping: 100-139, 140-179, exactly 180', () => {
    const throws = [
      { playerId: 'p1', score: 100 }, // tier100
      { playerId: 'p1', score: 139 }, // tier100
      { playerId: 'p1', score: 140 }, // tier140
      { playerId: 'p1', score: 179 }, // tier140
      { playerId: 'p1', score: 180 }, // tier180
      { playerId: 'p1', score: 60 },  // none
    ]
    const stats = computeVisitStats(throws)
    expect(stats.tier100).toBe(2)
    expect(stats.tier140).toBe(2)
    expect(stats.tier180).toBe(1)
  })
})

describe('computePlayerAverages', () => {
  it('gives every player in playerOrder a row, even with zero throws', () => {
    const averages = computePlayerAverages([{ playerId: 'p1', score: 60 }], ['p1', 'p2'])
    expect(averages).toEqual([
      { playerId: 'p1', playerIndex: 0, average: 60 },
      { playerId: 'p2', playerIndex: 1, average: null },
    ])
  })

  it('averages only each player\'s own throws, not the shared leg total', () => {
    const throws = [
      { playerId: 'dan', score: 60 },
      { playerId: 'stu', score: 45 },
      { playerId: 'dan', score: 140 },
      { playerId: 'stu', score: 60 },
    ]
    const averages = computePlayerAverages(throws, ['dan', 'stu'])
    expect(averages.find((a) => a.playerId === 'dan')?.average).toBe(100)
    expect(averages.find((a) => a.playerId === 'stu')?.average).toBe(52.5)
  })
})

describe('computeLegAverages', () => {
  it('maps leg status to a result and computes each played leg\'s average', () => {
    const legs = [
      { order: 0, status: 'Completed', result: 'Win', score: [{ playerId: 'p1', score: 180 }, { playerId: 'p1', score: 140 }, { playerId: 'p1', score: 100 }, { playerId: 'p1', score: 81 }] },
      { order: 1, status: 'Started', result: '', score: [{ playerId: 'p1', score: 60 }, { playerId: 'p1', score: 100 }, { playerId: 'p1', score: 41 }] },
      { order: 2, status: 'Pending', result: '', score: [] },
    ]

    const averages = computeLegAverages(legs)

    expect(averages[0]).toEqual({ order: 0, average: 125.25, result: 'won' })
    expect(averages[1]).toEqual({ order: 1, average: 67, result: 'live' })
    expect(averages[2]).toEqual({ order: 2, average: null, result: 'pending' })
  })

  it('maps a Completed/Loss leg to result "lost"', () => {
    const legs = [{ order: 0, status: 'Completed', result: 'Loss', score: [{ playerId: 'p1', score: 60 }] }]
    expect(computeLegAverages(legs)[0]?.result).toBe('lost')
  })

  it('sorts by order regardless of input order', () => {
    const legs = [
      { order: 2, status: 'Pending', result: '', score: [] },
      { order: 0, status: 'Completed', result: 'Win', score: [{ playerId: 'p1', score: 60 }] },
      { order: 1, status: 'Started', result: '', score: [] },
    ]
    expect(computeLegAverages(legs).map((l) => l.order)).toEqual([0, 1, 2])
  })
})

describe('padLegAverages', () => {
  it('pads an empty list with pending placeholders up to the game type\'s leg count', () => {
    const padded = padLegAverages([], 'Singles')
    expect(padded).toEqual([
      { order: 0, average: null, result: 'pending' },
      { order: 1, average: null, result: 'pending' },
      { order: 2, average: null, result: 'pending' },
    ])
  })

  it('only pads the missing legs, leaving real ones untouched', () => {
    const padded = padLegAverages([{ order: 0, average: 125.25, result: 'won' }], 'Singles')
    expect(padded).toEqual([
      { order: 0, average: 125.25, result: 'won' },
      { order: 1, average: null, result: 'pending' },
      { order: 2, average: null, result: 'pending' },
    ])
  })

  it('does not pad a single-leg game type once its one leg is present', () => {
    const padded = padLegAverages([{ order: 0, average: 66.2, result: 'live' }], 'Trebles')
    expect(padded).toHaveLength(1)
  })
})

describe('currentRound', () => {
  it('numbers rounds by player rotation, one throw per player per round', () => {
    expect(currentRound(0, 3)).toBe(1)
    expect(currentRound(2, 3)).toBe(1)
    expect(currentRound(3, 3)).toBe(2)
    expect(currentRound(6, 3)).toBe(3)
  })

  it('numbers every throw as its own round for a single-player (Singles) leg', () => {
    expect(currentRound(0, 1)).toBe(1)
    expect(currentRound(1, 1)).toBe(2)
  })

  it('does not divide by zero when playerCount is 0', () => {
    expect(currentRound(0, 0)).toBe(1)
  })
})

describe('isBullOffRound', () => {
  it('is never true when maxRounds is null (no League limit configured)', () => {
    expect(isBullOffRound(1, null)).toBe(false)
    expect(isBullOffRound(100, null)).toBe(false)
  })

  it('is false at or before the max round', () => {
    expect(isBullOffRound(1, 2)).toBe(false)
    expect(isBullOffRound(2, 2)).toBe(false)
  })

  it('is true once the round exceeds the max', () => {
    expect(isBullOffRound(3, 2)).toBe(true)
  })
})

describe('nextPlayerId', () => {
  it('cycles through playerOrder by throw count, wrapping around', () => {
    const players = ['dan', 'stu', 'truk']
    expect(nextPlayerId(0, players)).toBe('dan')
    expect(nextPlayerId(1, players)).toBe('stu')
    expect(nextPlayerId(2, players)).toBe('truk')
    expect(nextPlayerId(3, players)).toBe('dan') // wraps into round 2
    expect(nextPlayerId(4, players)).toBe('stu')
  })

  it('always returns the same single player for a Singles game', () => {
    expect(nextPlayerId(0, ['gary'])).toBe('gary')
    expect(nextPlayerId(7, ['gary'])).toBe('gary')
  })

  it('returns null when there are no players', () => {
    expect(nextPlayerId(0, [])).toBeNull()
  })
})
