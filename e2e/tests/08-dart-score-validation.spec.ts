import { test, expect } from '../fixtures/test'
import { createScheduledMatch, createGame, createLeg } from '../fixtures/api-client'

// API-level, same rationale as 07's header comment: no new Match can be
// started for the rest of this run (01-start-next-match.spec.ts already
// permanently holds the "one In Progress Match" slot), so this seeds a
// Game/Leg directly via POST and exercises LegControllerValidator's new
// per-visit dart-score checks through the real completion endpoints -
// proving the server itself rejects an impossible score, not just the
// client (ScoringConsole.vue has the same checks, covered by
// dartScoring.spec.ts and manual verification, not by this file).
test.describe('Server-side dart score validation', () => {
  test('completing a leg with a score no dartboard can produce is rejected', async ({ api }) => {
    const match = await createScheduledMatch(api, { opponent: `E2E Dart Score Opponent ${Date.now()}` })
    const playerRes = await api.post('/api/Player', { data: { name: `E2E Dart Score Player ${Date.now()}` } })
    const player = await playerRes.json()
    const game = await createGame(api, { matchId: match.id, type: 'Singles', playerIds: [player.id], legsToPlay: 1, startingScore: 501 })
    const leg = await createLeg(api, { gameID: game.id, remainingScore: 501 })

    // 179 is one of the 9 scores impossible to achieve with 3 real darts.
    const res = await api.put(`/api/Leg/${leg.id}/complete`, {
      data: { score: [{ playerId: player.id, score: 179 }], result: 'Loss', finishDarts: null, remainingScore: 322 },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.detail).toContain("not a score that's possible")
  })

  test('a checkout that reconciles but has no double-out combination is rejected', async ({ api }) => {
    const match = await createScheduledMatch(api, { opponent: `E2E Checkout Opponent ${Date.now()}` })
    const playerRes = await api.post('/api/Player', { data: { name: `E2E Checkout Player ${Date.now()}` } })
    const player = await playerRes.json()
    const game = await createGame(api, { matchId: match.id, type: 'Singles', playerIds: [player.id], legsToPlay: 1, startingScore: 501 })
    const leg = await createLeg(api, { gameID: game.id, remainingScore: 501 })

    // 180 + 162 + 159 = 501 (genuinely reconciles as a Win), but 159 - the
    // checkout visit - has no combination ending on a double.
    const res = await api.put(`/api/Leg/${leg.id}/complete`, {
      data: {
        score: [
          { playerId: player.id, score: 180 },
          { playerId: player.id, score: 162 },
          { playerId: player.id, score: 159 },
        ],
        result: 'Win',
        finishDarts: 3,
        remainingScore: 0,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.detail).toContain("can't be checked out")
  })

  test('a genuinely valid checkout still completes the leg normally', async ({ api }) => {
    const match = await createScheduledMatch(api, { opponent: `E2E Valid Checkout Opponent ${Date.now()}` })
    const playerRes = await api.post('/api/Player', { data: { name: `E2E Valid Checkout Player ${Date.now()}` } })
    const player = await playerRes.json()
    const game = await createGame(api, { matchId: match.id, type: 'Singles', playerIds: [player.id], legsToPlay: 1, startingScore: 501 })
    const leg = await createLeg(api, { gameID: game.id, remainingScore: 501 })

    // 180 + 180 + 141 = 501, and 141 is a real checkout (e.g. T20, T19, D12).
    const res = await api.put(`/api/Leg/${leg.id}/complete`, {
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
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('Completed')
    expect(body.data.result).toBe('Win')
  })
})
