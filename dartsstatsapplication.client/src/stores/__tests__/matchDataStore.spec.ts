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
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', true, 0, 3, 501, null)

    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 1, 0)

    expect(store.match?.games).toHaveLength(1)
    expect(store.match?.games[0]?.gameId).toBe('game-1')
  })

  it('resets to an empty games list when switching to a DIFFERENT match', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', true, 0, 3, 501, null)

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
    store.setGameData('game-1', ['player-1'], 'Singles', 'InProgress', '', false, 0, 3, 501, null)
    store.setSelectedGame('game-1')
    store.setLegData('game-1', 'leg-1', 'Completed', [], 'Win', 3, 0, 0, false)

    // Simulates completeGame(): setGameData() replaces the array entry with
    // fresh server data (Complete/Win), but doesn't update selectedGame's
    // reference, so selectedGame still points at the pre-completion object.
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', false, 0, 3, 501, null)

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
    store.setGameData('game-1', ['player-1'], 'Doubles', 'InProgress', '', false, 0, 1, 601, null)
    store.setLegData('game-1', 'leg-1', 'Started', [], '', 0, 0, 601, false)
    store.setSelectedLeg('leg-1')

    // Simulates completeLeg(): setLegData() replaces the array entry with
    // fresh server data (Completed/Win), but doesn't update selectedLeg's
    // reference, so selectedLeg still points at the pre-completion object.
    store.setLegData('game-1', 'leg-1', 'Completed', [], 'Win', 2, 0, 0, false)

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
    // ScoringConsole calls on every throw) land on that orphan and never
    // reach match.games[].legs[], so progress silently vanishes the moment
    // a leg is left mid-play (Back) rather than completed.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'InProgress', '', false, 0, 3, 501, null)
    store.setLegData('game-1', 'leg-1', 'Pending', [], '', 0, 0, 501, false)
    store.setSelectedGame('game-1')

    store.setSelectedLeg('leg-1')
    // Simulates startLeg()'s response arriving after setSelectedLeg() was
    // already called, replacing the leg object in game.legs[].
    store.setLegData('game-1', 'leg-1', 'Started', [], '', 0, 0, 501, false)

    store.updateSelectedLegScore({ 'player-1': 100 })

    const leg = store.match?.games[0]?.legs.find(l => l.legId === 'leg-1')
    expect(leg?.remainingScore).toBe(401)
    expect(store.selectedLeg?.remainingScore).toBe(401)
  })
})

describe('matchDataStore.clearSelectedLeg', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clears both selectedLeg and currentPlayer', () => {
    // Regression test: MatchControl.vue's handleSelectGame() only replaced
    // selectedLeg when the newly-selected game already had legs of its own
    // (i.e. had been started before) - a fresh/Ready game with no legs left
    // the PREVIOUS game's selectedLeg/currentPlayer in place, which
    // ScoreLedgerPanel/ScoringConsole (reading them directly) then
    // displayed for the new game.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Trebles', 'Complete', 'Loss', false, 0, 1, 701, null)
    store.setLegData('game-1', 'leg-1', 'Completed', [{ playerId: 'player-1', score: 100 }], 'Loss', 0, 0, 601, false)
    store.setSelectedGame('game-1')
    store.setSelectedLeg('leg-1')
    store.setNextPlayerTurn('player-1')

    store.clearSelectedLeg()

    expect(store.selectedLeg).toBeNull()
    expect(store.currentPlayer).toBeNull()
  })
})

describe('matchDataStore.completeSelectedLegByBullOff', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets the result and wonByBullOff, leaving finishDarts untouched', () => {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'InProgress', '', false, 0, 3, 501, 2)
    store.setLegData('game-1', 'leg-1', 'Started', [{ playerId: 'player-1', score: 60 }], '', 0, 0, 441, false)
    store.setSelectedGame('game-1')
    store.setSelectedLeg('leg-1')

    store.completeSelectedLegByBullOff('Win')

    expect(store.selectedLeg?.result).toBe('Win')
    expect(store.selectedLeg?.wonByBullOff).toBe(true)
    expect(store.selectedLeg?.finishDarts).toBe(0)
  })

  it('does nothing when there is no selected leg', () => {
    const store = useMatchDataStore()
    expect(() => store.completeSelectedLegByBullOff('Win')).not.toThrow()
    expect(store.selectedLeg).toBeNull()
  })
})

describe('matchDataStore.updateWonBull', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('patches wonBull on both match.games and selectedGame, preserving legs', () => {
    // Regression test: going through setGameData() here (as every other Game
    // endpoint response does) would rebuild the game object with legs:[],
    // silently discarding whatever legs this game already has - updateWonBull()
    // patches the field in place instead, precisely to avoid that.
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['player-1'], 'Singles', 'Complete', 'Win', false, 0, 3, 501, null)
    store.setLegData('game-1', 'leg-1', 'Completed', [], 'Win', 3, 0, 0, false)
    store.setSelectedGame('game-1')

    store.updateWonBull('game-1', true)

    const game = store.match?.games.find(g => g.gameId === 'game-1')
    expect(game?.wonBull).toBe(true)
    expect(game?.legs).toHaveLength(1)
    expect(store.selectedGame?.wonBull).toBe(true)
  })

  it('does nothing when there is no match', () => {
    const store = useMatchDataStore()
    expect(() => store.updateWonBull('game-1', true)).not.toThrow()
  })
})

describe('matchDataStore.editSelectedLegScoreEntry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function setupLeg() {
    const store = useMatchDataStore()
    store.setMatchData('match-1', 'Opponent', new Date(), 'Home', [], 'InProgress', 0, 0)
    store.setGameData('game-1', ['p1', 'p2'], 'Doubles', 'InProgress', '', false, 0, 1, 601, null)
    store.setLegData('game-1', 'leg-1', 'Started', [
      { playerId: 'p1', score: 60 },
      { playerId: 'p2', score: 45 },
      { playerId: 'p1', score: 20 },
    ], '', 0, 0, 476, false) // 601 - 60 - 45 - 20
    store.setSelectedGame('game-1')
    store.setSelectedLeg('leg-1')
    return store
  }

  it('replaces the entry at the given index and recomputes remainingScore', () => {
    const store = setupLeg()

    const ok = store.editSelectedLegScoreEntry(1, 85, 601) // p2's 45 was actually 85

    expect(ok).toBe(true)
    expect(store.selectedLeg?.score.map(s => s.score)).toEqual([60, 85, 20])
    expect(store.selectedLeg?.remainingScore).toBe(601 - 60 - 85 - 20)
  })

  it('recomputes remainingScore against every entry, not just from the edit point forward', () => {
    const store = setupLeg()

    // Edit the FIRST throw - later throws (already summed once) must not be double-counted.
    store.editSelectedLegScoreEntry(0, 100, 601)

    expect(store.selectedLeg?.remainingScore).toBe(601 - 100 - 45 - 20)
  })

  it('refuses an edit that would drive remainingScore negative, leaving state unchanged', () => {
    const store = setupLeg()

    // Other two throws (p2:45, p1:20) total 65, so with a 601 start, editing
    // index 0 up to 179 still leaves 357 remaining - valid - but 600 would
    // push the total to 665, past the 601 start - invalid.
    const ok = store.editSelectedLegScoreEntry(0, 179, 601)
    const ok2 = store.editSelectedLegScoreEntry(0, 600, 601)

    expect(ok).toBe(true)
    expect(ok2).toBe(false)
    expect(store.selectedLeg?.score[0]?.score).toBe(179) // ok's edit stuck, ok2's did not
    expect(store.selectedLeg?.remainingScore).toBe(601 - 179 - 45 - 20)
  })

  it('returns false for an out-of-range index and leaves the leg unchanged', () => {
    const store = setupLeg()
    const before = store.selectedLeg?.remainingScore

    const ok = store.editSelectedLegScoreEntry(99, 50, 601)

    expect(ok).toBe(false)
    expect(store.selectedLeg?.remainingScore).toBe(before)
  })

  it('returns false when there is no selected leg', () => {
    const store = useMatchDataStore()
    expect(store.editSelectedLegScoreEntry(0, 50, 501)).toBe(false)
  })
})
