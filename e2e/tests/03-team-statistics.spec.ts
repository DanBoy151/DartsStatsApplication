import { test, expect } from '../fixtures/test'

// Doesn't need seededMatch's match at all - just the players, so this can run
// independently of the "one match In Progress at a time" constraint the
// other spec files are built around.
test.describe('Team Statistics', () => {
  test('is reachable from the launch screen "View Statistics" button', async ({
    seededMatch,
    launchScreen,
    teamStatisticsScreen,
  }) => {
    const { players } = seededMatch

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await launchScreen.clickViewStatistics()

    await expect(teamStatisticsScreen.heading).toHaveText('Team Statistics')

    // Freshly-seeded players have played no legs yet, but still get a row -
    // with placeholders, not omitted from the sheet.
    const row = teamStatisticsScreen.rows.filter({ hasText: players[0]!.name })
    await expect(row).toBeVisible()
    await expect(row).toContainText('0-0') // W-L
    await expect(row).toContainText('—') // no average yet

    await teamStatisticsScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('is reachable from the menu bar (Statistics > Team)', async ({
    launchScreen,
    menuBar,
    teamStatisticsScreen,
  }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openTeamStatistics()

    await expect(teamStatisticsScreen.heading).toHaveText('Team Statistics')
  })

  test('names the Checkout% gap rather than faking a number', async ({
    launchScreen,
    teamStatisticsScreen,
  }) => {
    // Regression guard: the server doesn't track missed-double attempts, so
    // this column must never render anything but the placeholder.
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await launchScreen.clickViewStatistics()

    await expect(teamStatisticsScreen.rows.first()).toBeVisible()
    const checkoutCells = teamStatisticsScreen.rows.locator('td.na-col')
    const count = await checkoutCells.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(checkoutCells.nth(i)).toHaveText('—')
    }
  })
})
