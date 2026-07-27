import { test, expect } from '../fixtures/test'

// Runs only under the `mobile`/`tablet` Playwright projects (see
// playwright.config.ts's testMatch/testIgnore) - the full serial match-flow
// suite already covers scoring behaviour end-to-end on desktop; this spec
// exists purely to catch a future regression in Match Center's phone/tablet
// *layout*, which the desktop-only suite can never trigger. The redesigned
// Match Center (ScoringConsole + collapsible Ledger/Stats + an on-demand
// games drawer) has no fixed breakpoints of its own - everything reflows
// fluidly via flex-wrap/container queries - so this asserts "nothing
// overflows its container" rather than "a specific tier's mode is active".
// Intentionally a single small test, not a full replay of the desktop
// suite, to keep CI runtime bounded.
test('Match Center adapts to phone/tablet viewports', async ({
  page,
  launchScreen,
  availablePlayersScreen,
  gameSummaryPanel,
  selectPlayersGameScreen,
  matchCenterScreen,
  seededMatch,
}) => {
  const { players } = seededMatch

  await launchScreen.goto()
  await launchScreen.waitUntilLoaded()
  await launchScreen.clickPlayMatch()

  await availablePlayersScreen.waitUntilLoaded()
  // At least 5 available players are required match-wide (see
  // MatchControllerValidator's "Not Enough Players Selected" check) even
  // though only one is actually used below - matches 01-start-next-match.
  // spec.ts's own setup of marking every seeded player available.
  for (const player of players) {
    await availablePlayersScreen.setPlayerAvailable(player.name, true)
  }
  await availablePlayersScreen.proceed()
  await expect(gameSummaryPanel.root).toBeVisible()

  // Singles only needs one player - fastest game type to get into MatchCenter with.
  await gameSummaryPanel.gameBoxByType('Singles').click()
  await selectPlayersGameScreen.selectPlayer(0, players[0]!.name)
  await selectPlayersGameScreen.saveButton.click()
  await expect(gameSummaryPanel.root).toBeVisible()

  await gameSummaryPanel.gameBoxByType('Singles').click()
  await expect(matchCenterScreen.root).toBeVisible()

  // Neither viewport tier should ever force page-level horizontal scroll.
  await expect(async () => {
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(overflowing).toBe(false)
  }).toPass()

  // The two secondary cards (Ledger/Stats) are visible and never spill past
  // the console's own edges, whichever way flex-wrap has arranged them at
  // this width - this is the actual invariant a fluid, breakpoint-free
  // layout has to hold, rather than asserting a specific "mode".
  await expect(matchCenterScreen.scoreLedgerCard).toBeVisible()
  await expect(matchCenterScreen.statsCard).toBeVisible()
  const [shellBox, ledgerBox, statsBox] = await Promise.all([
    page.locator('.match-center').boundingBox(),
    matchCenterScreen.scoreLedgerCard.boundingBox(),
    matchCenterScreen.statsCard.boundingBox(),
  ])
  for (const box of [ledgerBox, statsBox]) {
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(shellBox!.x - 1)
    expect(box!.x + box!.width).toBeLessThanOrEqual(shellBox!.x + shellBox!.width + 1)
  }

  // Collapsing a secondary card (native <details>, no framework state)
  // still works at every width.
  await matchCenterScreen.scoreLedgerCard.locator('summary').click()
  await expect(matchCenterScreen.scoreLedgerCard.locator('.panel-body')).not.toBeVisible()
  await matchCenterScreen.scoreLedgerCard.locator('summary').click()
  await expect(matchCenterScreen.scoreLedgerCard.locator('.panel-body')).toBeVisible()

  // The on-demand games drawer replaces the old permanent side rail -
  // confirm it opens, fits within the viewport (it has its own max-width:
  // min(420px, 90vw) clamp), and closes again, at every width.
  await matchCenterScreen.openGamesDrawer()
  const drawerBox = await matchCenterScreen.gamesDrawer.boundingBox()
  expect(drawerBox).not.toBeNull()
  const viewportWidth = page.viewportSize()?.width ?? 0
  expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(viewportWidth + 1)
  await matchCenterScreen.gamesDrawerClose.click()
  await expect(matchCenterScreen.gamesDrawer).not.toBeVisible()

  await matchCenterScreen.startGame()

  // Keypad digits must stay comfortably tappable (~44px) at every tier, not just phone.
  const digitButton = matchCenterScreen.keypad.locator('button[data-key="5"]')
  await expect(digitButton).toBeVisible()
  const box = await digitButton.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(40)
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)

  // Submit is reachable via (at most) vertical scrolling - never requires
  // horizontal scroll, and ScoringConsole auto-scrolls itself into view when
  // a leg starts (see ScoringConsole.vue's watch(started, ...)), so this
  // should usually already be satisfied without the explicit scroll below;
  // it's here so the assertion checks reachability itself rather than
  // exactly how close the app's own auto-scroll got, which is sensitive to
  // font-rendering differences between environments.
  await matchCenterScreen.submitScoreButton.scrollIntoViewIfNeeded()
  await expect(matchCenterScreen.submitScoreButton).toBeInViewport()
})

// Second, independent test in this file (also runs under mobile/tablet via
// testMatch) - Player Statistics' Current Form list is a CSS Grid whose
// opponent column can force the row (and the page) wider than the viewport
// for a long, unbreakable club name, unrelated to Match Center's own layout
// above. Seeded via direct API calls (no /start), so it doesn't compete for
// the app's single "one Match In Progress at a time" slot the test above holds.
test('Player Statistics Current Form does not overflow with a long opponent name', async ({
  page,
  api,
  launchScreen,
  menuBar,
  playerStatisticsScreen,
}) => {
  const playerRes = await api.post('/api/Player', { data: { name: `E2E Long Opponent Player ${Date.now()}` } })
  const player = await playerRes.json()

  const matchRes = await api.post('/api/Match', {
    data: {
      status: 'Scheduled',
      opponent: 'Greensborough Blue Hogs',
      date: new Date().toISOString().slice(0, 10),
      location: 'Home',
      gamesFor: 0,
      gamesAgainst: 0,
    },
  })
  const match = await matchRes.json()

  const gameRes = await api.post('/api/Game', {
    data: {
      matchId: match.id,
      type: 'Singles',
      status: 'InProgress',
      playerIds: [player.id],
      wonBull: true,
      order: 0,
      legsToPlay: 1,
      startingScore: 501,
      maxRounds: null,
    },
  })
  const game = await gameRes.json()

  const legRes = await api.post('/api/Leg', {
    data: { gameID: game.id, status: 'Started', score: [], result: null, finishDarts: null, order: 0, remainingScore: 501 },
  })
  const leg = await legRes.json()

  await api.put(`/api/Leg/${leg.id}/complete`, {
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
  await api.put(`/api/Game/${game.id}/complete`, { data: { result: 'Win' } })

  await launchScreen.goto()
  await launchScreen.waitUntilLoaded()
  await menuBar.openPlayerStatistics()
  await playerStatisticsScreen.selectPlayer(player.data.name)

  await expect(playerStatisticsScreen.formPanel).toContainText('Greensborough Blue Hogs')

  // Regression test: .form-game's 1fr opponent column had no min-width:0/
  // truncation, so a long, unbreakable club name forced the row (and the
  // whole page) wider than the viewport.
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  )
  expect(overflowing).toBe(false)
})
