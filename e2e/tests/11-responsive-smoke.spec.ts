import { test, expect } from '../fixtures/test'

// Runs only under the `mobile`/`tablet` Playwright projects (see
// playwright.config.ts's testMatch/testIgnore) - the full serial match-flow
// suite already covers scoring behaviour end-to-end on desktop; this spec
// exists purely to catch a future regression in Match Center's phone/tablet
// *layout* (MatchCenter.vue/MatchControl.vue's @media tiers), which the
// desktop-only suite can never trigger. Intentionally a single small test,
// not a full replay of the desktop suite, to keep CI runtime bounded.
test('Match Center adapts to phone/tablet viewports', async ({
  page,
  launchScreen,
  availablePlayersScreen,
  holdingScreen,
  gameSummaryPanel,
  selectPlayersGameScreen,
  matchCenterScreen,
  seededMatch,
}, testInfo) => {
  const { players } = seededMatch
  const isPhone = testInfo.project.name === 'mobile'

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
  await expect(holdingScreen.root).toBeVisible()

  // Singles only needs one player - fastest game type to get into MatchCenter with.
  await gameSummaryPanel.gameBoxByType('Singles').click()
  await selectPlayersGameScreen.selectPlayer(0, players[0]!.name)
  await selectPlayersGameScreen.saveButton.click()
  await expect(holdingScreen.root).toBeVisible()

  await gameSummaryPanel.gameBoxByType('Singles').click()
  await expect(matchCenterScreen.root).toBeVisible()

  // Neither viewport tier should ever force page-level horizontal scroll.
  await expect(async () => {
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(overflowing).toBe(false)
  }).toPass()

  if (isPhone) {
    // Phone tier: tab switcher, one panel at a time. Before the leg starts,
    // Remaining Score (with Start) is the default - Enter Score isn't
    // reachable/useful yet, so it should be hidden, not just disabled.
    await expect(matchCenterScreen.tabRemaining).toBeVisible()
    await expect(matchCenterScreen.remainingScorePanelQuarter).toBeVisible()
    await expect(matchCenterScreen.enterScorePanelQuarter).not.toBeVisible()
  } else {
    // Tablet tier: single stacked column, every panel visible at once - no tabs.
    await expect(matchCenterScreen.tabRemaining).not.toBeVisible()
    await expect(matchCenterScreen.remainingScorePanelQuarter).toBeVisible()
    await expect(matchCenterScreen.enterScorePanelQuarter).toBeVisible()
  }

  await matchCenterScreen.startGame()

  if (isPhone) {
    // Starting the leg should auto-switch the tab to Enter Score.
    await expect(matchCenterScreen.enterScorePanelQuarter).toBeVisible()
    await expect(matchCenterScreen.remainingScorePanelQuarter).not.toBeVisible()

    // Manually switching away and back is still possible mid-leg.
    await matchCenterScreen.tabStats.click()
    await expect(matchCenterScreen.statsPanelQuarter).toBeVisible()
    await matchCenterScreen.tabEnter.click()
    await expect(matchCenterScreen.enterScorePanelQuarter).toBeVisible()
  }

  // Keypad digits must stay comfortably tappable (~44px) at every tier, not just phone.
  const digitButton = matchCenterScreen.keypad.locator('button[data-key="5"]')
  await expect(digitButton).toBeVisible()
  const box = await digitButton.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(40)
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)

  // Submit is reachable without scrolling the panel horizontally.
  await expect(matchCenterScreen.submitScoreButton).toBeInViewport()
})
