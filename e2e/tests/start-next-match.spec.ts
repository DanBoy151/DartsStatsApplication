import { test, expect } from '../fixtures/test'

// These two scenarios are ordered deliberately: the "no next match" case must
// run against a genuinely empty database, before the second test seeds any
// data. describe.serial guarantees that order (and that a failure in the
// first test skips the second, rather than running it against unknown state).
test.describe.serial('Start next match', () => {
  test('shows an error toast rather than a friendly empty state when there is no next match', async ({
    page,
    errorToast,
  }) => {
    // KNOWN ISSUE (see BUGS.md): apiClient.request() treats every non-2xx
    // response as an error, including this one, where a 404 from
    // GET /api/Match/next legitimately means "nothing scheduled yet" rather
    // than a failure. The user sees a red, technical toast
    // ("Request to /api/Match/next failed: 404 Not Found") on first launch
    // of a brand new install, before any match has ever been created. This
    // test documents that *current* behaviour so a future fix is a visible,
    // deliberate diff here rather than a silent regression.
    test.info().annotations.push({
      type: 'known-issue',
      description: 'BUGS.md #2 - "no next match" surfaces as a raw error toast instead of an empty state',
    })

    await page.goto('/')

    await expect(errorToast.root).toBeVisible()
    await expect(errorToast.message).toHaveText('Request to /api/Match/next failed: 404 Not Found')
  })

  test('captain can start the next match end-to-end', async ({
    page,
    seededMatch,
    launchScreen,
    availablePlayersScreen,
    holdingScreen,
    gameSummaryPanel,
  }) => {
    const { match, players } = seededMatch

    await test.step('next match appears on the launch screen', async () => {
      await launchScreen.goto()
      await launchScreen.waitUntilLoaded()
      await expect(launchScreen.playMatchButton).toBeVisible()
      await expect(launchScreen.nextMatchLabel).toContainText(match.opponent)
      await expect(launchScreen.nextMatchLabel).toContainText('(H)')
    })

    await test.step('starting the match reaches the available players screen', async () => {
      await launchScreen.clickPlayMatch()
      await availablePlayersScreen.waitUntilLoaded()
      await expect(availablePlayersScreen.heading).toHaveText('Select Available Players')
      await expect(availablePlayersScreen.playerItems).toHaveCount(players.length)

      // No players are pre-selected: match.availablePlayers is unset until
      // the roster is confirmed on this screen.
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(0)
    })

    await test.step('confirming the roster reaches the holding screen with games loaded', async () => {
      for (const player of players) {
        await availablePlayersScreen.setPlayerAvailable(player.name, true)
      }
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(players.length)

      // AvailablePlayersControl.proceed() fires the roster PUT and navigates
      // away without awaiting it (see BUGS.md #3) - wait for the response
      // ourselves so this test isn't racing that bug.
      const updateResponse = page.waitForResponse(
        (res) => res.url().includes(`/api/Match/${match.id}/update-available-players`) && res.request().method() === 'PUT'
      )
      await availablePlayersScreen.proceed()
      expect((await updateResponse).status()).toBe(200)

      await expect(holdingScreen.root).toBeVisible()
      await expect(holdingScreen.heading).toHaveText('Please Select Game')

      // Start: 2 Trebles, 3 Doubles, 6 Singles - see MatchService.CreatePendingGames.
      await expect(gameSummaryPanel.gameBoxes).toHaveCount(11)
      await expect(gameSummaryPanel.opposition).toHaveText(match.opponent)
      await expect(gameSummaryPanel.currentScore).toHaveText('0 - 0')
    })

    await test.step('selecting a pending game opens player selection for it', async () => {
      await gameSummaryPanel.selectGame(0)
      await expect(page.locator('.select-players-game-control')).toBeVisible()
      await expect(page.locator('.select-players-game-control .player-list-heading')).toHaveText('Select Players')
    })
  })
})
