import { test, expect } from '../fixtures/test'
import { createScheduledMatch } from '../fixtures/api-client'

// These scenarios are ordered deliberately: the "no next match" case must run
// against a genuinely empty database, before anything else seeds data.
// describe.serial is a hard ordering guarantee *within one file* (unlike
// file-execution order across separate spec files, which isn't a documented
// guarantee) - it also means a failure partway through skips the rest,
// rather than running later steps against unknown state.
test.describe.serial('Start next match', () => {
  test('shows a friendly empty state, not an error toast, when there is no next match', async ({
    page,
    launchScreen,
    errorToast,
  }) => {
    // Regression test for BUGS.md #5 (fixed): GET /api/Match/next 404s when
    // nothing is scheduled - a normal, expected state (e.g. a fresh
    // install), not a failure. getNextMatch() now recognises that 404
    // specifically and clears the error the shared apiClient sets by
    // default, so no toast should appear here.
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await expect(errorToast.root).not.toBeVisible()
    await expect(launchScreen.nextMatchLabel).toHaveText('No match scheduled')
    await expect(launchScreen.playMatchButton).toBeVisible()

    // Regression test for BUGS.md #8 (fixed): MainContent.vue's dead `error`
    // ref/div must not come back.
    await expect(page.locator('.error-message')).toHaveCount(0)
  })

  test('captain can start the next match end-to-end', async ({
    page,
    api,
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

    await test.step('reloading the page does not lose the fetched match (BUGS.md #4)', async () => {
      // Regression test: MainContent.vue used to call clearStore()
      // unconditionally on every mount, wiping matchDataStore.match (and any
      // in-progress selections) on every reload/remount. It now calls
      // resetStore(), which only clears state older than 6 hours.
      await page.reload()
      await launchScreen.waitUntilLoaded()
      await expect(launchScreen.nextMatchLabel).toContainText(match.opponent)
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

    await test.step('proceeding waits for the roster to save before navigating (BUGS.md #6)', async () => {
      for (const player of players) {
        await availablePlayersScreen.setPlayerAvailable(player.name, true)
      }
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(players.length)

      // Regression test: AvailablePlayersControl.proceed() used to fire the
      // roster PUT without awaiting it, then navigate immediately. Delay the
      // response under our control and prove the UI now waits for it.
      let releaseResponse: () => void
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve
      })
      await page.route('**/update-available-players', async (route) => {
        await responseGate
        await route.continue()
      })

      await availablePlayersScreen.proceed()

      // The PUT is still gated - we must still be on the roster screen.
      await expect(holdingScreen.root).not.toBeVisible()
      await expect(availablePlayersScreen.root).toBeVisible()

      // Resolving the gate lets this (and any later) matching request
      // through immediately - no need to unroute.
      releaseResponse!()

      await expect(holdingScreen.root).toBeVisible()
      await expect(holdingScreen.heading).toHaveText('Please Select Game')

      // Start: 2 Trebles, 3 Doubles, 6 Singles - see MatchService.CreatePendingGames.
      await expect(gameSummaryPanel.gameBoxes).toHaveCount(11)
      await expect(gameSummaryPanel.opposition).toHaveText(match.opponent)
      await expect(gameSummaryPanel.currentScore).toHaveText('0 - 0')
    })

    await test.step('"Back to Players" returns to the roster screen (BUGS.md #9)', async () => {
      await holdingScreen.backButton.click()
      await expect(availablePlayersScreen.root).toBeVisible()
      await expect(availablePlayersScreen.heading).toHaveText('Select Available Players')

      // Selections made earlier are still there (matchAvailablePlayers is cached in the store).
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(players.length)

      await availablePlayersScreen.proceed()
      await expect(holdingScreen.root).toBeVisible()
    })

    await test.step('selecting a pending game opens player selection for it', async () => {
      await gameSummaryPanel.selectGame(0)
      await expect(page.locator('.select-players-game-control')).toBeVisible()
      await expect(page.locator('.select-players-game-control .player-list-heading')).toHaveText('Select Players')
    })

    await test.step('completing a game reaches validation instead of crashing (BUGS.md #10)', async () => {
      // API-level regression test: GameService.CompleteGame ran the exact
      // same kind of synchronous Marten query (`.ToList()` directly on the
      // IQueryable, for the game's legs) as the Match/CompleteMatch bug (#3),
      // and crashed with a bare 500 the same way.
      //
      // Reuses this test's own match/games (already In Progress) rather than
      // creating a new one - only one match can be In Progress at a time,
      // and this test is already holding that slot, so a second one here
      // would 400 on start() instead of exercising anything useful. Any of
      // the 11 games works: selecting one in the UI (previous step) doesn't
      // change its status server-side, so they're all still Pending - enough
      // to exercise the query and reach validation without playing out legs.
      const gamesRes = await api.get(`/api/Match/${match.id}/games`)
      const games: { id: string; data: { status: string } }[] = await gamesRes.json()
      const pendingGame = games.find((g) => g.data.status === 'Pending')!

      const completeRes = await api.put(`/api/Game/${pendingGame.id}/complete`, {
        data: { result: 'Win' },
      })

      // Pre-fix this was a 500 ("An unexpected error occurred") before the
      // request ever reached business-rule validation. Post-fix, the query
      // itself succeeds (0 legs) and we reach the expected validation error
      // instead.
      expect(completeRes.status()).toBe(400)
      const body = await completeRes.json()
      expect(body.detail).toBe('Unable to complete a Game that is not In Progress')
    })
  })

  test('completing a match reaches validation instead of crashing (BUGS.md #3)', async ({ api }) => {
    // API-level (no browser) regression test: MatchService.CompleteMatch ran
    // a synchronous Marten query (`.ToList()` directly on the IQueryable),
    // which threw NotSupportedException under Marten 9 and surfaced as a
    // bare 500. There's no UI path to "complete a match" yet, so this is
    // covered at the API level rather than through the browser.
    //
    // CompleteMatch doesn't check the match's status, so this deliberately
    // never calls start() - a plain Scheduled match with zero games is
    // enough to exercise the query, and it keeps this test fully
    // independent of the "one match In Progress at a time" global rule the
    // previous test's match is still holding.
    const match = await createScheduledMatch(api, { opponent: 'API Regression Opponent' })

    const completeRes = await api.put(`/api/Match/${match.id}/complete`, {
      data: {
        id: match.id,
        playerOfMatch: '00000000-0000-0000-0000-000000000000',
        result: 'Win',
      },
    })

    // Pre-fix this was a 500 ("An unexpected error occurred") before the
    // request ever reached business-rule validation. Post-fix, the query
    // itself succeeds (0 games) and we reach the expected validation error
    // instead.
    expect(completeRes.status()).toBe(400)
    const body = await completeRes.json()
    expect(body.detail).toBe('Unable to complete a Match that has no Games')
  })
})
