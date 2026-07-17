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

describe('matchDataStore.setMatchData', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts a new match with an empty games list', () => {
    const store = useMatchDataStore()

    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'Scheduled', 0, 0)

    expect(store.match?.games).toEqual([])
  })

  it('preserves already-loaded games when re-setting data for the SAME match', () => {
    // Regression test: completing a game calls updateMatchScore(), which
    // calls setMatchData() again for the same match - this used to reset
    // games back to [] every time, which is what made GameSummaryPanel go
    // blank right after completing a game.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', true, 0)

    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 1, 0)

    expect(store.match?.games).toHaveLength(1)
    expect(store.match?.games[0]?.gameId).toBe('game-1')
  })

  it('resets to an empty games list when switching to a DIFFERENT match', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', true, 0)

    store.setMatchData('match-2', 'Different Opponent', new Date(), 'Away', [], 'Scheduled', 0, 0)

    expect(store.match?.games).toEqual([])
  })
})

describe('matchDataStore.doneWithSelectedGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does nothing when there is no selected game', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)

    expect(() => store.doneWithSelectedGame()).not.toThrow()
  })

  it('keeps the status/result setGameData() already wrote, merging in the legs selectedGame accumulated', () => {
    // Regression test: this used to blindly overwrite match.games[i] with
    // the stale selectedGame object, reverting a just-completed game's
    // status back to whatever it was before completion.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'InProgress', '', false, 0)
    store.setSelectedGame('game-1')
    store.setLegData('game-1', 'leg-1', 'Completed', [], 'Win', 3, 0, 0)

    // Simulates completeGame(): setGameData() replaces the array entry with
    // fresh server data (Complete/Win), but doesn't update selectedGame's
    // reference, so selectedGame still points at the pre-completion object.
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', false, 0)

    store.doneWithSelectedGame()

    const game = store.match?.games.find(g => g.gameId === 'game-1')
    expect(game?.status).toBe('Complete')
    expect(game?.result).toBe('Win')
    expect(game?.legs).toHaveLength(1)
    expect(game?.legs[0]?.legId).toBe('leg-1')
    expect(store.selectedGame).toBeNull()
  })
})

describe('matchDataStore.doneWithSelectedLeg', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does nothing when there is no selected leg', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)

    expect(() => store.doneWithSelectedLeg()).not.toThrow()
  })

  it('leaves the leg exactly as setLegData() already wrote it, and clears selectedLeg', () => {
    // Regression test: this used to blindly overwrite the leg with the
    // stale selectedLeg reference (which, after startLeg() replaces
    // game.legs[i] with a new object, is left pointing at an orphaned
    // pre-start copy) - reverting a just-completed leg back to its
    // pre-completion state and causing MatchCenter's win/loss tally (which
    // reads game.legs, not selectedLeg) to see the wrong result.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Doubles', 'InProgress', '', false, 0)
    store.setLegData('game-1', 'leg-1', 'Started', [], '', 0, 0, 601)
    store.setSelectedLeg('leg-1')

    // Simulates completeLeg(): setLegData() replaces the array entry with
    // fresh server data (Completed/Win), but doesn't update selectedLeg's
    // reference, so selectedLeg still points at the pre-completion object.
    store.setLegData('game-1', 'leg-1', 'Completed', [], 'Win', 2, 0, 0)

    store.doneWithSelectedLeg()

    const leg = store.match?.games[0]?.legs.find(l => l.legId === 'leg-1')
    expect(leg?.status).toBe('Completed')
    expect(leg?.result).toBe('Win')
    expect(store.selectedLeg).toBeNull()
  })
})

describe('matchDataStore.setLegData resyncing selectedLeg', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps selectedLeg pointing at the live leg object after setSelectedLeg() is called before a setLegData() update (e.g. startLeg() resolving)', () => {
    // Regression test: MatchCenter.vue's startNextLeg() calls
    // setSelectedLeg(legId) and THEN awaits startLeg(), whose response
    // triggers setLegData() - which replaces game.legs[i] with a new
    // object. Without resyncing selectedLeg the same way selectedGame
    // already is, selectedLeg is left pointing at the orphaned pre-start
    // copy: further mutations (e.g. updateSelectedLegScore(), as
    // EnterScorePanel calls on every throw) land on that orphan and never
    // reach match.games[].legs[], so progress silently vanishes the moment
    // a leg is left mid-play (Back) rather than completed.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'InProgress', '', false, 0)
    store.setLegData('game-1', 'leg-1', 'Pending', [], '', 0, 0, 501)
    store.setSelectedGame('game-1')

    store.setSelectedLeg('leg-1')
    // Simulates startLeg()'s response arriving after setSelectedLeg() was
    // already called, replacing the leg object in game.legs[].
    store.setLegData('game-1', 'leg-1', 'Started', [], '', 0, 0, 501)

    store.updateSelectedLegScore({ 'player-1': 100 })

    const leg = store.match?.games[0]?.legs.find(l => l.legId === 'leg-1')
    expect(leg?.remainingScore).toBe(401)
    expect(store.selectedLeg?.remainingScore).toBe(401)
  })
})
