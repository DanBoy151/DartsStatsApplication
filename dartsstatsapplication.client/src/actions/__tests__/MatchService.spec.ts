import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMatchDataStore } from '@/stores/matchDataStore'
import type { RawMatchData } from '@/models/MatchModel'
import { apiRequest } from '@/actions/apiClient'
import { recordOppositionHeadcount } from '../MatchService'

vi.mock('@/actions/apiClient', () => ({
  apiGet: vi.fn(),
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

const mockedApiRequest = vi.mocked(apiRequest)

const MATCH_ID = 'match-1'
const AVAILABLE = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

/** The match as the server returns it from PUT opposition-headcount. */
function serverMatch(gamesFor: number, gamesAgainst: number, oppositionShortHanded: boolean | null = null): RawMatchData {
  return {
    id: MATCH_ID,
    data: {
      opponent: 'Opponent',
      location: 'Home',
      date: '2026-09-29',
      availablePlayers: AVAILABLE,
      status: 'InProgress',
      gamesFor,
      gamesAgainst,
      oppositionShortHanded,
    },
  }
}

function seedInProgressMatch(gamesFor = 0, gamesAgainst = 0) {
  const store = useMatchDataStore()
  store.setMatchData(MATCH_ID, 'Opponent', new Date('2026-09-29'), 'Home', AVAILABLE, 'InProgress', gamesFor, gamesAgainst)
  store.setGameData('singles-last', [], 'Singles', 'Pending', '', false, 5, 3, 501, null)
  return store
}

describe('recordOppositionHeadcount', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedApiRequest.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sends the opposition headcount to the current match', async () => {
    seedInProgressMatch()
    mockedApiRequest.mockResolvedValue(serverMatch(0, 0))

    await recordOppositionHeadcount(true)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `/api/Match/${MATCH_ID}/opposition-headcount`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ oppositionShortHanded: true }) }),
    )
  })

  it('counts a walkover win on the last Singles game in the match score straight away', async () => {
    const store = seedInProgressMatch()
    // Opposition short a player, we're at full strength - the server
    // forfeits the last Singles game to us and bumps gamesFor.
    mockedApiRequest.mockResolvedValue(serverMatch(1, 0))

    await recordOppositionHeadcount(true)

    expect(store.getMatchData()?.gamesFor).toBe(1)
    expect(store.getMatchData()?.gamesAgainst).toBe(0)
  })

  it('adds the walkover win on top of a score already in the store', async () => {
    const store = seedInProgressMatch(2, 3)
    mockedApiRequest.mockResolvedValue(serverMatch(3, 3))

    await recordOppositionHeadcount(true)

    expect(store.getMatchData()?.gamesFor).toBe(3)
    expect(store.getMatchData()?.gamesAgainst).toBe(3)
  })

  it('counts a walkover loss against us when our own side is the one short', async () => {
    const store = seedInProgressMatch()
    mockedApiRequest.mockResolvedValue(serverMatch(0, 1))

    await recordOppositionHeadcount(false)

    expect(store.getMatchData()?.gamesFor).toBe(0)
    expect(store.getMatchData()?.gamesAgainst).toBe(1)
  })

  it('leaves the score unchanged when nothing was forfeited', async () => {
    const store = seedInProgressMatch()
    mockedApiRequest.mockResolvedValue(serverMatch(0, 0))

    await recordOppositionHeadcount(false)

    expect(store.getMatchData()?.gamesFor).toBe(0)
    expect(store.getMatchData()?.gamesAgainst).toBe(0)
  })

  it('keeps the same match loaded and clears the cached games so the forfeited game is refetched', async () => {
    const store = seedInProgressMatch()
    expect(store.getMatchData()?.games).toHaveLength(1)
    mockedApiRequest.mockResolvedValue(serverMatch(1, 0))

    await recordOppositionHeadcount(true)

    expect(store.getMatchData()?.matchId).toBe(MATCH_ID)
    expect(store.getMatchData()?.status).toBe('InProgress')
    expect(store.getMatchData()?.games).toEqual([])
  })

  it('leaves the stored score alone when the request fails', async () => {
    const store = seedInProgressMatch(1, 1)
    mockedApiRequest.mockRejectedValue(new Error('boom'))

    await expect(recordOppositionHeadcount(true)).resolves.toBeUndefined()

    expect(store.getMatchData()?.gamesFor).toBe(1)
    expect(store.getMatchData()?.gamesAgainst).toBe(1)
  })

  it('remembers the recorded answer so Back to Players starts from it', async () => {
    const store = seedInProgressMatch()
    mockedApiRequest.mockResolvedValue(serverMatch(1, 0, true))

    await recordOppositionHeadcount(true)

    expect(store.getMatchData()?.oppositionShortHanded).toBe(true)
  })

  it('takes the walkover back off the score when the box is unticked on a re-Proceed', async () => {
    const store = seedInProgressMatch()
    mockedApiRequest.mockResolvedValueOnce(serverMatch(1, 0, true))
    await recordOppositionHeadcount(true)
    expect(store.getMatchData()?.gamesFor).toBe(1)

    // Back to Players, untick, Proceed - the server undoes the forfeit.
    mockedApiRequest.mockResolvedValueOnce(serverMatch(0, 0, false))
    await recordOppositionHeadcount(false)

    expect(store.getMatchData()?.gamesFor).toBe(0)
    expect(store.getMatchData()?.gamesAgainst).toBe(0)
    expect(store.getMatchData()?.oppositionShortHanded).toBe(false)
    expect(store.getMatchData()?.games).toEqual([])
  })

  it('does nothing when there is no current match', async () => {
    await recordOppositionHeadcount(true)

    expect(mockedApiRequest).not.toHaveBeenCalled()
  })
})
