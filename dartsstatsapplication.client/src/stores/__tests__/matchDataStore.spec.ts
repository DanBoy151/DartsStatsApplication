import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMatchDataStore } from '../matchDataStore'

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

describe('matchDataStore.resetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does nothing when memDateTime was never set', () => {
    const store = useMatchDataStore()

    expect(() => store.resetStore()).not.toThrow()
    expect(store.match).toBeNull()
  })

  it('keeps match data when memDateTime is less than 6 hours old', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.memDateTime = hoursAgo(1)
    const before = store.memDateTime

    store.resetStore()

    expect(store.match).not.toBeNull()
    expect(store.match?.matchId).toBe('match-1')
    // Regression: resetStore() used to mutate memDateTime in place via
    // Date.setHours, silently pushing its own expiry back on every call.
    expect(store.memDateTime).toEqual(before)
  })

  it('clears match data when memDateTime is more than 6 hours old', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.memDateTime = hoursAgo(7)

    store.resetStore()

    expect(store.match).toBeNull()
    expect(store.matchAvailablePlayers).toEqual([])
  })
})
