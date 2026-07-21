import { test, expect } from '../fixtures/test'
import { createLeague, createTeam, createSeason, createGame, createLeg } from '../fixtures/api-client'

// API-level seeding, same rationale as 07/08: 01-start-next-match.spec.ts
// permanently holds the app's single "one In Progress Match" slot, so no
// later spec can start a real match through the UI. This seeds a player's
// whole leg/game history directly (POST /api/Game + POST /api/Leg + the real
// completion endpoints), then drives the Player Statistics screen itself
// through the browser to prove the join/filter/season-scoping logic in
// PlayerController and the Vue screen built on top of it.
function formatDecimal(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

interface PlayerStatsResponse {
  legsPlayed: number
  legsWon: number
  legsLost: number
  threeDartAverage: number | null
}

test.describe('Player Statistics screen', () => {
  test('shows a player\'s overall/singles/doubles/trebles stats, supports independent per-section season filtering, and is reachable from Team Statistics', async ({
    api,
    launchScreen,
    menuBar,
    teamStatisticsScreen,
    playerStatisticsScreen,
  }) => {
    const runId = Date.now()
    const league = await createLeague(api, { name: `E2E Player Stats League ${runId}`, numSingles: 1, singlesLegs: 1, singlesStartScore: 501 })
    const team = await createTeam(api, `E2E Player Stats Team ${runId}`)
    const season = await createSeason(api, { name: `E2E Player Stats Season ${runId}`, leagueId: league.id, teamId: team.id })

    const playerRes = await api.post('/api/Player', { data: { name: `E2E Player Stats Player ${runId}` } })
    const player = await playerRes.json()
    const partnerRes = await api.post('/api/Player', { data: { name: `E2E Player Stats Partner ${runId}` } })
    const partner = await partnerRes.json()

    const seasonMatchRes = await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Player Stats Season Opponent ${runId}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
        seasonId: season.id,
      },
    })
    const seasonMatch = await seasonMatchRes.json()

    const otherMatchRes = await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Player Stats Other Opponent ${runId}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
      },
    })
    const otherMatch = await otherMatchRes.json()

    await test.step('seed a season-linked Singles win, a non-season Singles loss, and a non-season Doubles win', async () => {
      // Season-linked Singles game: won via a genuine checkout (180+180+141=501).
      const seasonSinglesGame = await createGame(api, {
        matchId: seasonMatch.id,
        type: 'Singles',
        playerIds: [player.id],
        legsToPlay: 1,
        startingScore: 501,
      })
      const seasonSinglesLeg = await createLeg(api, { gameID: seasonSinglesGame.id, remainingScore: 501 })
      const seasonLegRes = await api.put(`/api/Leg/${seasonSinglesLeg.id}/complete`, {
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
      expect(seasonLegRes.status()).toBe(200)
      const seasonGameCompleteRes = await api.put(`/api/Game/${seasonSinglesGame.id}/complete`, { data: { result: 'Win' } })
      expect(seasonGameCompleteRes.status()).toBe(200)

      // Non-season Singles game: lost (opponent checked out first).
      const otherSinglesGame = await createGame(api, {
        matchId: otherMatch.id,
        type: 'Singles',
        playerIds: [player.id],
        legsToPlay: 1,
        startingScore: 501,
        order: 0,
      })
      const otherSinglesLeg = await createLeg(api, { gameID: otherSinglesGame.id, remainingScore: 501 })
      const otherLegRes = await api.put(`/api/Leg/${otherSinglesLeg.id}/complete`, {
        data: {
          score: [
            { playerId: player.id, score: 60 },
            { playerId: player.id, score: 60 },
            { playerId: player.id, score: 60 },
          ],
          result: 'Loss',
          finishDarts: null,
          remainingScore: 321,
        },
      })
      expect(otherLegRes.status()).toBe(200)
      const otherGameCompleteRes = await api.put(`/api/Game/${otherSinglesGame.id}/complete`, { data: { result: 'Loss' } })
      expect(otherGameCompleteRes.status()).toBe(200)

      // Non-season Doubles game: won, player throws 3 of the 4 visits.
      const doublesGame = await createGame(api, {
        matchId: otherMatch.id,
        type: 'Doubles',
        playerIds: [player.id, partner.id],
        legsToPlay: 1,
        startingScore: 601,
        order: 1,
      })
      const doublesLeg = await createLeg(api, { gameID: doublesGame.id, remainingScore: 601 })
      const doublesLegRes = await api.put(`/api/Leg/${doublesLeg.id}/complete`, {
        data: {
          score: [
            { playerId: player.id, score: 180 },
            { playerId: partner.id, score: 180 },
            { playerId: player.id, score: 100 },
            { playerId: player.id, score: 141 },
          ],
          result: 'Win',
          finishDarts: 3,
          remainingScore: 0,
        },
      })
      expect(doublesLegRes.status()).toBe(200)
      const doublesGameCompleteRes = await api.put(`/api/Game/${doublesGame.id}/complete`, { data: { result: 'Win' } })
      expect(doublesGameCompleteRes.status()).toBe(200)
    })

    let overallStats: PlayerStatsResponse
    let singlesStats: PlayerStatsResponse
    let doublesStats: PlayerStatsResponse
    let seasonSinglesStats: PlayerStatsResponse

    await test.step('the underlying API reflects the join across all three games', async () => {
      overallStats = await (await api.get(`/api/Player/${player.id}/stats`)).json()
      singlesStats = await (await api.get(`/api/Player/${player.id}/stats?gameType=Singles`)).json()
      doublesStats = await (await api.get(`/api/Player/${player.id}/stats?gameType=Doubles`)).json()
      const treblesStats: PlayerStatsResponse = await (await api.get(`/api/Player/${player.id}/stats?gameType=Trebles`)).json()
      seasonSinglesStats = await (await api.get(`/api/Player/${player.id}/stats?gameType=Singles&seasonId=${season.id}`)).json()

      expect(overallStats.legsPlayed).toBe(3)
      expect(overallStats.legsWon).toBe(2)
      expect(overallStats.legsLost).toBe(1)
      expect(singlesStats.legsPlayed).toBe(2)
      expect(singlesStats.legsWon).toBe(1)
      expect(singlesStats.legsLost).toBe(1)
      expect(doublesStats.legsPlayed).toBe(1)
      expect(doublesStats.legsWon).toBe(1)
      expect(treblesStats.legsPlayed).toBe(0)
      expect(seasonSinglesStats.legsPlayed).toBe(1)
      expect(seasonSinglesStats.legsWon).toBe(1)
    })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await test.step('opening Player Statistics from the menu and selecting the player shows all four sections matching the API', async () => {
      await menuBar.openPlayerStatistics()
      await playerStatisticsScreen.selectPlayer(player.data.name)

      await expect(playerStatisticsScreen.formPanel).toBeVisible()
      await expect(playerStatisticsScreen.trendBadge).toBeVisible()

      await expect(playerStatisticsScreen.section('overall')).toContainText(`${overallStats.legsWon}-${overallStats.legsLost}`)
      await expect(playerStatisticsScreen.section('singles')).toContainText(`${singlesStats.legsWon}-${singlesStats.legsLost}`)
      await expect(playerStatisticsScreen.section('doubles')).toContainText(`${doublesStats.legsWon}-${doublesStats.legsLost}`)
      await expect(playerStatisticsScreen.section('trebles')).toContainText('No legs played in Trebles')

      expect(await playerStatisticsScreen.statValue('overall', 'Legs')).toBe(String(overallStats.legsPlayed))
      expect(await playerStatisticsScreen.statValue('singles', 'Legs')).toBe(String(singlesStats.legsPlayed))
      expect(await playerStatisticsScreen.statValue('singles', '3DA')).toBe(formatDecimal(singlesStats.threeDartAverage))
      expect(await playerStatisticsScreen.statValue('doubles', 'Legs')).toBe(String(doublesStats.legsPlayed))
      expect(await playerStatisticsScreen.statValue('doubles', '3DA')).toBe(formatDecimal(doublesStats.threeDartAverage))
    })

    await test.step('filtering the Singles section by season updates only that section', async () => {
      await playerStatisticsScreen.filterSectionBySeason('singles', `${season.name} (Active)`)

      await expect(async () => {
        expect(await playerStatisticsScreen.statValue('singles', 'Legs')).toBe(String(seasonSinglesStats.legsPlayed))
      }).toPass()
      await expect(playerStatisticsScreen.section('singles')).toContainText(`${seasonSinglesStats.legsWon}-${seasonSinglesStats.legsLost}`)

      // Overall/Doubles never had their own season selector touched - they
      // must still show the unfiltered, all-time numbers.
      expect(await playerStatisticsScreen.statValue('overall', 'Legs')).toBe(String(overallStats.legsPlayed))
      expect(await playerStatisticsScreen.statValue('doubles', 'Legs')).toBe(String(doublesStats.legsPlayed))
    })

    await test.step('clicking the player\'s name on Team Statistics lands on Player Statistics with them pre-selected', async () => {
      await playerStatisticsScreen.doneButton.click()
      await menuBar.openTeamStatistics()
      await teamStatisticsScreen.clickPlayerName(player.data.name)

      await expect(playerStatisticsScreen.playerSelect).toHaveValue(player.id)
      expect(await playerStatisticsScreen.statValue('overall', 'Legs')).toBe(String(overallStats.legsPlayed))
    })
  })
})
