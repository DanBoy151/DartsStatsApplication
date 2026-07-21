import { test, expect } from '../fixtures/test'
import { createLeague, createTeam, createSeason, createGame, createLeg } from '../fixtures/api-client'

// This suite is API-level rather than driven through the "start a match"
// browser flow: MatchControllerValidator.IsValidToStartMatch enforces "only
// one In Progress Match at a time" globally, and playwright.config.ts runs
// this whole suite in a single serial worker specifically because of that
// rule. 01-start-next-match.spec.ts already permanently claims that slot
// (its match is deliberately never played out to Completed, and
// MatchCenter.vue's finishMatch() is a no-op stub - nothing in the app ever
// transitions a match away from InProgress), so no later spec file can call
// Match.start() again for the rest of the run. 01's own final two tests hit
// this same wall and work around it by calling the Game/Match endpoints
// directly instead of going through the UI - this file does the same for
// Game/Leg, using POST /api/Game and POST /api/Leg (which store whatever's
// sent, with no status/lifecycle checks) to seed a Game exactly as
// MatchService.CreatePendingGames would have stamped it from a League's
// config, then exercises the round-limit and bull-off completion logic
// through the real Leg endpoints.
test.describe('League-configured max rounds and bull-off', () => {
  test('a leg past the configured max rounds must be decided by bull-off, and the bull-off result feeds team stats', async ({
    api,
    launchScreen,
    menuBar,
    teamStatisticsScreen,
  }) => {
    const league = await createLeague(api, {
      name: `E2E Bull-Off League ${Date.now()}`,
      numTrebles: 0,
      numDoubles: 0,
      numSingles: 1,
      singlesLegs: 1,
      singlesStartScore: 501,
      maxRounds: 2,
    })
    const team = await createTeam(api, `E2E Bull-Off Team ${Date.now()}`)
    const playerRes = await api.post('/api/Player', {
      data: { name: `E2E Bull-Off Player ${Date.now()}`, teamId: team.id },
    })
    const player = await playerRes.json()
    const season = await createSeason(api, { name: `E2E Bull-Off Season ${Date.now()}`, leagueId: league.id, teamId: team.id })
    const matchRes = await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Bull-Off Opponent ${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
        seasonId: season.id,
      },
    })
    const match = await matchRes.json()

    const game = await createGame(api, {
      matchId: match.id,
      type: 'Singles',
      playerIds: [player.id],
      legsToPlay: 1,
      startingScore: 501,
      maxRounds: 2,
    })

    // 1 player, maxRounds=2: 3 visits already recorded means round 3 has
    // started - past the limit. Two separate legs exercise the two ways a
    // leg can still end past that point: a normal Loss (the scorer
    // confirming the opponent already checked out) and a bull-off (neither
    // side checked out).
    const threeVisits = [
      { playerId: player.id, score: 60 },
      { playerId: player.id, score: 60 },
      { playerId: player.id, score: 60 },
    ]

    await test.step('a normal Loss completion past max rounds still succeeds (the opponent checked out)', async () => {
      const leg = await createLeg(api, { gameID: game.id, order: 0, remainingScore: 501 })
      const res = await api.put(`/api/Leg/${leg.id}/complete`, {
        data: { score: threeVisits, result: 'Loss', finishDarts: null, remainingScore: 321 },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('Completed')
      expect(body.data.result).toBe('Loss')
      expect(body.data.wonByBullOff).toBe(false)
    })

    const bullOffLeg = await createLeg(api, { gameID: game.id, order: 1, remainingScore: 501 })

    await test.step('the bull-off endpoint completes the leg, persisting the real pre-threshold throws', async () => {
      const res = await api.put(`/api/Leg/${bullOffLeg.id}/complete-bull-off`, {
        data: { score: threeVisits, result: 'Win', remainingScore: 321 },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('Completed')
      expect(body.data.result).toBe('Win')
      expect(body.data.wonByBullOff).toBe(true)
      expect(body.data.finishDarts).toBeNull()
      expect(body.data.score).toHaveLength(3)
    })

    await test.step('team stats count both legs, but exclude the bull-off win from checkout/best-leg stats', async () => {
      const res = await api.get(`/api/Team/${team.id}/stats?seasonId=${season.id}`)
      expect(res.status()).toBe(200)
      const stats: {
        playerId: string
        legsWon: number
        legsLost: number
        threeDartAverage: number | null
        highestCheckout: number | null
        bestLegDarts: number | null
      }[] = await res.json()

      const playerStats = stats.find((s) => s.playerId === player.id)
      expect(playerStats).toBeDefined()
      expect(playerStats!.legsWon).toBe(1)
      expect(playerStats!.legsLost).toBe(1)
      // Both legs: 3 visits x 3 darts = 9 darts, 180 points each -> (180+180)/(9+9)*3 = 60.
      expect(playerStats!.threeDartAverage).toBe(60)
      // Neither leg had a real checkout - the Loss never reached 0, and the
      // Win was decided by bull-off, not a checkout throw.
      expect(playerStats!.highestCheckout).toBeNull()
      expect(playerStats!.bestLegDarts).toBeNull()
    })

    await test.step('the Team Statistics screen shows the same result once filtered to this team and season', async () => {
      await launchScreen.goto()
      await launchScreen.waitUntilLoaded()
      await menuBar.openTeamStatistics()

      await teamStatisticsScreen.filterByTeam(team.name)
      await teamStatisticsScreen.filterBySeason(`${season.name} (Active)`)

      const row = teamStatisticsScreen.rows.filter({ hasText: player.data.name })
      await expect(row).toBeVisible()
      await expect(row).toContainText('1-1')
    })
  })

  test('bull-off completion is rejected before max rounds, but available the moment the max round itself is reached', async ({ api }) => {
    const league = await createLeague(api, {
      name: `E2E Early Bull-Off League ${Date.now()}`,
      numTrebles: 0,
      numDoubles: 0,
      numSingles: 1,
      singlesLegs: 1,
      singlesStartScore: 501,
      maxRounds: 2,
    })
    const team = await createTeam(api, `E2E Early Bull-Off Team ${Date.now()}`)
    const playerRes = await api.post('/api/Player', {
      data: { name: `E2E Early Bull-Off Player ${Date.now()}`, teamId: team.id },
    })
    const player = await playerRes.json()
    const season = await createSeason(api, { name: `E2E Early Bull-Off Season ${Date.now()}`, leagueId: league.id, teamId: team.id })
    const matchRes = await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Early Bull-Off Opponent ${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
        seasonId: season.id,
      },
    })
    const match = await matchRes.json()

    const game = await createGame(api, {
      matchId: match.id,
      type: 'Singles',
      playerIds: [player.id],
      legsToPlay: 1,
      startingScore: 501,
      maxRounds: 2,
    })

    await test.step('one visit recorded - only round 1 of 2 - bull-off is rejected', async () => {
      const leg = await createLeg(api, { gameID: game.id, order: 0, remainingScore: 501 })
      const oneVisit = [{ playerId: player.id, score: 60 }]

      const bullOffRes = await api.put(`/api/Leg/${leg.id}/complete-bull-off`, {
        data: { score: oneVisit, result: 'Win', remainingScore: 441 },
      })
      expect(bullOffRes.status()).toBe(400)
      const body = await bullOffRes.json()
      expect(body.detail).toContain('has not reached the max rounds')
    })

    await test.step('two visits recorded - exactly the max round itself - bull-off is available immediately, with no extra round required', async () => {
      const leg = await createLeg(api, { gameID: game.id, order: 1, remainingScore: 501 })
      const twoVisits = [
        { playerId: player.id, score: 60 },
        { playerId: player.id, score: 60 },
      ]

      const bullOffRes = await api.put(`/api/Leg/${leg.id}/complete-bull-off`, {
        data: { score: twoVisits, result: 'Win', remainingScore: 381 },
      })
      expect(bullOffRes.status()).toBe(200)
      const body = await bullOffRes.json()
      expect(body.data.status).toBe('Completed')
      expect(body.data.wonByBullOff).toBe(true)
    })
  })
})
