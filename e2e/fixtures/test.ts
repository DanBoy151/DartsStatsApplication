import { test as base, expect, request as apiRequestFactory, type APIRequestContext } from '@playwright/test'
import { API_BASE_URL } from '../support/env'
import { createPlayers, createScheduledMatch, type SeededMatch, type SeededPlayer } from './api-client'
import { LaunchScreen } from '../pages/LaunchScreen'
import { AvailablePlayersScreen } from '../pages/AvailablePlayersScreen'
import { HoldingScreen } from '../pages/HoldingScreen'
import { GameSummaryPanel } from '../pages/GameSummaryPanel'
import { SelectPlayersGameScreen } from '../pages/SelectPlayersGameScreen'
import { ErrorToast } from '../pages/ErrorToast'
import { MenuBar } from '../pages/MenuBar'
import { NewPlayerScreen } from '../pages/NewPlayerScreen'
import { NewMatchScreen } from '../pages/NewMatchScreen'
import { MatchCenterScreen } from '../pages/MatchCenterScreen'
import { TeamStatisticsScreen } from '../pages/TeamStatisticsScreen'

export interface SeededMatchData {
  match: SeededMatch
  players: SeededPlayer[]
}

interface Fixtures {
  api: APIRequestContext
  /**
   * Creates 6 fresh players and one Scheduled match via the real API. Player
   * names are unique per call, but note that GET /api/Player (and therefore
   * the Available Players screen) returns every player ever created against
   * this database, not just this fixture's - so only one test per run should
   * rely on an exact player count. See tests/01-start-next-match.spec.ts.
   */
  seededMatch: SeededMatchData
  launchScreen: LaunchScreen
  availablePlayersScreen: AvailablePlayersScreen
  holdingScreen: HoldingScreen
  gameSummaryPanel: GameSummaryPanel
  selectPlayersGameScreen: SelectPlayersGameScreen
  errorToast: ErrorToast
  menuBar: MenuBar
  newPlayerScreen: NewPlayerScreen
  newMatchScreen: NewMatchScreen
  matchCenterScreen: MatchCenterScreen
  teamStatisticsScreen: TeamStatisticsScreen
}

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const context = await apiRequestFactory.newContext({ baseURL: API_BASE_URL })
    await use(context)
    await context.dispose()
  },

  seededMatch: async ({ api }, use, testInfo) => {
    const runId = `${Date.now()}-w${testInfo.workerIndex}`
    const players = await createPlayers(api, 6, `E2E Player ${runId}`)
    const match = await createScheduledMatch(api, { opponent: `E2E Opponent ${runId}` })
    await use({ match, players })
  },

  launchScreen: async ({ page }, use) => {
    await use(new LaunchScreen(page))
  },
  availablePlayersScreen: async ({ page }, use) => {
    await use(new AvailablePlayersScreen(page))
  },
  holdingScreen: async ({ page }, use) => {
    await use(new HoldingScreen(page))
  },
  gameSummaryPanel: async ({ page }, use) => {
    await use(new GameSummaryPanel(page))
  },
  selectPlayersGameScreen: async ({ page }, use) => {
    await use(new SelectPlayersGameScreen(page))
  },
  errorToast: async ({ page }, use) => {
    await use(new ErrorToast(page))
  },
  menuBar: async ({ page }, use) => {
    await use(new MenuBar(page))
  },
  newPlayerScreen: async ({ page }, use) => {
    await use(new NewPlayerScreen(page))
  },
  newMatchScreen: async ({ page }, use) => {
    await use(new NewMatchScreen(page))
  },
  matchCenterScreen: async ({ page }, use) => {
    await use(new MatchCenterScreen(page))
  },
  teamStatisticsScreen: async ({ page }, use) => {
    await use(new TeamStatisticsScreen(page))
  },
})

export { expect }
