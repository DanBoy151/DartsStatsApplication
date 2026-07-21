import { test, expect } from '../fixtures/test'
import { createLeague, createGame, createLeg } from '../fixtures/api-client'

// API-level, same rationale as 07/08/09: 01-start-next-match.spec.ts
// permanently holds the app's single "one In Progress Match" slot, so no
// later spec can drive a real match through to completion via the browser -
// especially not this one, since a match's default game count (2 Trebles +
// 3 Doubles + 6 Singles with no League) would mean playing out 11 games
// through the UI just to reach "every game is Complete". A League configured
// for exactly one Singles game sidesteps that, and lets this exercise the
// real PUT /api/Match/{id}/complete contract that MatchService.completeMatch()
// (called from MatchCenter.vue's new Complete Match prompt) depends on.
test.describe('Completing a match', () => {
  test('a match with every game Complete can be completed with a Player of the Match', async ({ api }) => {
    const league = await createLeague(api, {
      name: `E2E Complete Match League ${Date.now()}`,
      numTrebles: 0,
      numDoubles: 0,
      numSingles: 1,
      singlesLegs: 1,
      singlesStartScore: 501,
    })
    const playerRes = await api.post('/api/Player', { data: { name: `E2E Complete Match Player ${Date.now()}` } })
    const player = await playerRes.json()

    const matchRes = await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Complete Match Opponent ${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
      },
    })
    const match = await matchRes.json()

    const game = await createGame(api, {
      matchId: match.id,
      type: 'Singles',
      playerIds: [player.id],
      legsToPlay: 1,
      startingScore: 501,
    })

    await test.step('completing the match before its one game is Complete is rejected', async () => {
      const res = await api.put(`/api/Match/${match.id}/complete`, {
        data: { id: match.id, playerOfMatch: player.id, result: 'Win' },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.detail).toContain('Games that are not Complete')
    })

    const leg = await createLeg(api, { gameID: game.id, remainingScore: 501 })
    const legRes = await api.put(`/api/Leg/${leg.id}/complete`, {
      data: {
        score: [
          { playerId: player.id, score: 180 },
          { playerId: player.id, score: 180 },
          { playerId: player.id, score: 141 },
        ],
        result: 'Win',
        finishDarts: 3,
        remainingScore: 0,
      },
    })
    expect(legRes.status()).toBe(200)
    const gameCompleteRes = await api.put(`/api/Game/${game.id}/complete`, { data: { result: 'Win' } })
    expect(gameCompleteRes.status()).toBe(200)

    await test.step('a Player of the Match who never played in the match is rejected', async () => {
      const outsiderRes = await api.post('/api/Player', { data: { name: `E2E Complete Match Outsider ${Date.now()}` } })
      const outsider = await outsiderRes.json()

      const res = await api.put(`/api/Match/${match.id}/complete`, {
        data: { id: match.id, playerOfMatch: outsider.id, result: 'Win' },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.detail).toContain('must have played')
    })

    await test.step('completing with a valid Player of the Match succeeds', async () => {
      const res = await api.put(`/api/Match/${match.id}/complete`, {
        data: { id: match.id, playerOfMatch: player.id, result: 'Win' },
      })
      expect(res.status()).toBe(200)

      const getRes = await api.get(`/api/Match/${match.id}`)
      const body = await getRes.json()
      expect(body.data.status).toBe('Completed')
      expect(body.data.playerOfMatch).toBe(player.id)
    })
  })
})
