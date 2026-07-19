import { describe, expect, it } from 'vitest'
import {
  totalLegsForGameType,
  legsRequiredToWin,
  isGameDecided,
  lastTouchedLeg,
  startingScoreForGameType,
  buildLedgerRows,
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
})
