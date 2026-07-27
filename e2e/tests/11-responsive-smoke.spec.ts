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
