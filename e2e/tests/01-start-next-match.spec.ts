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
    gameSummaryPanel,
    selectPlayersGameScreen,
    matchCenterScreen,
    menuBar,
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
      await expect(gameSummaryPanel.root).not.toBeVisible()
      await expect(availablePlayersScreen.root).toBeVisible()

      // Resolving the gate lets this (and any later) matching request
      // through immediately - no need to unroute.
      releaseResponse!()

      await expect(gameSummaryPanel.root).toBeVisible()
      await expect(gameSummaryPanel.heading).toHaveText('Select Game')

      // Start: 2 Trebles, 3 Doubles, 6 Singles - see MatchService.CreatePendingGames.
      await expect(gameSummaryPanel.gameBoxes).toHaveCount(11)
      await expect(gameSummaryPanel.opposition).toHaveText(match.opponent)
      await expect(gameSummaryPanel.currentScore).toHaveText('0 - 0')
    })

    await test.step('"Back to Players" returns to the roster screen (BUGS.md #9)', async () => {
      await gameSummaryPanel.backButton.click()
      await expect(availablePlayersScreen.root).toBeVisible()
      await expect(availablePlayersScreen.heading).toHaveText('Select Available Players')

      // Selections made earlier are still there (matchAvailablePlayers is cached in the store).
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(players.length)

      await availablePlayersScreen.proceed()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('a rejected roster save does not cascade into recording opposition headcount', async () => {
      // Regression test: setAvailablePlayers() used to swallow any failure
      // and return void regardless, so proceed() cascaded into calling
      // recordOppositionHeadcount() anyway - masking the real rejection
      // reason behind a second, more confusing "not InProgress" error from
      // that call instead (the shared error toast only ever shows the latest).
      await gameSummaryPanel.backButton.click()
      await expect(availablePlayersScreen.root).toBeVisible()

      let oppositionHeadcountCalled = false
      await page.route('**/opposition-headcount', async (route) => {
        oppositionHeadcountCalled = true
        await route.continue()
      })
      await page.route('**/update-available-players', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Forced failure for regression test' }),
        })
      })

      await availablePlayersScreen.proceed()

      // Stays on the roster screen rather than cascading forward.
      await expect(availablePlayersScreen.root).toBeVisible()
      await expect(gameSummaryPanel.root).not.toBeVisible()
      expect(oppositionHeadcountCalled).toBe(false)

      await page.unroute('**/update-available-players')
      await page.unroute('**/opposition-headcount')

      // A retry (the failure above was forced, nothing really wrong with the roster) succeeds normally.
      await availablePlayersScreen.proceed()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('selecting a pending game opens player selection for it', async () => {
      await gameSummaryPanel.gameBoxByType('Doubles').click()
      await expect(selectPlayersGameScreen.root).toBeVisible()
      await expect(selectPlayersGameScreen.heading).toHaveText('Select Players — Doubles')
      await expect(selectPlayersGameScreen.playerDropdowns).toHaveCount(2)
    })

    await test.step('assigning players and saving returns to the holding screen', async () => {
      await selectPlayersGameScreen.selectPlayer(0, players[0]!.name)
      await selectPlayersGameScreen.selectPlayer(1, players[1]!.name)
      await selectPlayersGameScreen.saveButton.click()

      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('a Ready game (players already assigned) opens straight into MatchCenter, with Edit Players pre-filled and non-mutating', async () => {
      // Uses the same Doubles(0) game the previous step just readied - Cancel
      // at the end leaves its roster untouched for the "playing a game
      // through to completion" step right after this one, which still
      // expects players[0]/players[1].
      await gameSummaryPanel.gameBoxByType('Doubles').click()
      await expect(matchCenterScreen.root).toBeVisible()
      await expect(selectPlayersGameScreen.root).not.toBeVisible()
      await expect(matchCenterScreen.editPlayersButton).toBeVisible()

      await matchCenterScreen.editPlayersButton.click()
      await expect(selectPlayersGameScreen.root).toBeVisible()
      await expect(selectPlayersGameScreen.heading).toHaveText('Select Players — Doubles')
      expect(await selectPlayersGameScreen.selectedPlayerName(0)).toBe(players[0]!.name)
      expect(await selectPlayersGameScreen.selectedPlayerName(1)).toBe(players[1]!.name)

      await selectPlayersGameScreen.cancelButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('playing a game through to completion keeps the summary panel populated (BUGS.md #11-13)', async () => {
      // Regression test for the reported bug: "completing a game causes the
      // game summary panel to end up blank". Root cause chain, all fixed
      // together since none of them individually get you to a working
      // "complete a game" flow:
      //
      // #11 matchDataStore.setMatchData() unconditionally reset games to []
      //     on every call - including the one updateMatchScore() makes right
      //     after completing a game - which is what actually blanked the
      //     panel. doneWithSelectedGame()/doneWithSelectedLeg() also each
      //     independently overwrote the fresh, correct data setGameData()/
      //     setLegData() had just written with a stale local reference,
      //     reverting a just-completed game/leg's status.
      // #12 MatchCenter's onFinishLeg() didn't await completeLeg(), so
      //     finishGame() could call completeGame() before the leg's PUT had
      //     actually persisted server-side - "Unable to complete a Game
      //     while it has Legs that are not Completed".
      // #13 LegController.CompleteLeg returned the request DTO instead of
      //     the updated Leg document, so the client's local game.legs never
      //     saw the real result - MatchCenter's win/loss tally (read from
      //     game.legs, not the leg the score was entered against) then sent
      //     the wrong result to completeGame() - "Game result 'Loss' does
      //     not match the Leg outcomes (Wins: 1, Losses: 0)".
      await gameSummaryPanel.gameBoxByType('Doubles').click()
      await expect(matchCenterScreen.root).toBeVisible()

      await matchCenterScreen.startGame()

      // Doubles starts at 601. A single throw is capped at 180 (three darts,
      // max 60 each), so check out across several realistic throws.
      for (const throwScore of [180, 180, 180]) {
        await matchCenterScreen.enterScore(throwScore)
      }
      await expect(matchCenterScreen.turnRemaining).toHaveText('61')
      await matchCenterScreen.enterScore(61)
      await matchCenterScreen.finishLeg(2)

      // Doubles is single-leg, so finishing it finishes the game and returns
      // to the holding screen automatically.
      await expect(gameSummaryPanel.root).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('.error-toast')).not.toBeVisible()

      await expect(gameSummaryPanel.gameBoxes).toHaveCount(11)
      const completedBox = gameSummaryPanel.gameBoxByType('Doubles')
      await expect(completedBox).toContainText('Complete')
      await expect(completedBox).toContainText(`${players[0]!.name}/${players[1]!.name}`)
    })

    await test.step('Finish completes a leg as a Loss when clicked before checking out', async () => {
      // Product requirement: hitting Finish should always complete the leg -
      // at remaining=0 that's the existing checkout/Win flow (covered
      // above); at any other remaining score it's a Loss, immediately, no
      // darts-count prompt.
      await gameSummaryPanel.gameBoxByType('Trebles').click()
      await selectPlayersGameScreen.selectPlayer(0, players[0]!.name)
      await selectPlayersGameScreen.selectPlayer(1, players[1]!.name)
      await selectPlayersGameScreen.selectPlayer(2, players[2]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      await gameSummaryPanel.gameBoxByType('Trebles').click()
      await matchCenterScreen.startGame()

      await matchCenterScreen.enterScore(100)
      await expect(matchCenterScreen.turnRemaining).toHaveText('601')

      await matchCenterScreen.clickFinish()
      await expect(matchCenterScreen.doublesFinishDialog).not.toBeVisible()

      // Trebles is single-leg, so a Loss here decides the game too.
      await expect(gameSummaryPanel.root).toBeVisible({ timeout: 10_000 })
      const trebles = gameSummaryPanel.gameBoxByType('Trebles')
      await expect(trebles).toContainText('Complete')
    })

    await test.step('editing a previously-recorded throw in the Score Ledger updates the running remaining score', async () => {
      // Product requirement: correct a scorer's mis-entry mid-leg. The edit
      // must cascade into every later throw's running remaining (not just
      // from the edit point forward), and - since mid-leg progress only
      // reaches the server via completeLeg() - the corrected value is what
      // ends up persisted once the leg finishes.
      await gameSummaryPanel.gameBoxByType('Doubles', 1).click()
      await selectPlayersGameScreen.selectPlayer(0, players[2]!.name)
      await selectPlayersGameScreen.selectPlayer(1, players[3]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      await gameSummaryPanel.gameBoxByType('Doubles', 1).click()
      await matchCenterScreen.startGame()

      await matchCenterScreen.enterScore(60)
      await matchCenterScreen.enterScore(45)
      await expect(matchCenterScreen.turnRemaining).toHaveText('496')

      // Editing the FIRST throw (60 -> 100) must cascade past the second,
      // already-recorded throw: 601 - 100 - 45 = 456.
      await matchCenterScreen.editLedgerScore(0, 100)
      await expect(matchCenterScreen.turnRemaining).toHaveText('456')

      // An invalid edit is refused with an inline error, not silently
      // clamped or accepted.
      await matchCenterScreen.editLedgerScore(0, 999)
      await expect(matchCenterScreen.ledgerEditError).toBeVisible()
      await expect(matchCenterScreen.turnRemaining).toHaveText('456')

      // Finish the leg as a Loss - Doubles is single-leg, so this also
      // completes the game and returns to the holding screen. The edited
      // value only reaches the server via this completeLeg() call (mid-leg
      // progress is client-only), so reaching Complete here - rather than a
      // validation error - is itself proof the corrected score round-tripped.
      await matchCenterScreen.clickFinish()
      await expect(gameSummaryPanel.root).toBeVisible({ timeout: 10_000 })
      await expect(gameSummaryPanel.gameBoxByType('Doubles', 1)).toContainText('Complete')
    })

    await test.step('a best-of-3 Singles game finishes early once the outcome is mathematically decided', async () => {
      // Product requirement: with 2 of 3 legs won, the 3rd leg can't change
      // the outcome - the game should complete without playing it out.
      await gameSummaryPanel.gameBoxByType('Singles').click()
      await selectPlayersGameScreen.selectPlayer(0, players[0]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      await gameSummaryPanel.gameBoxByType('Singles').click()
      await matchCenterScreen.startGame()

      // Leg 1 (Win): checkout across realistic throws (single-throw cap 180).
      for (const throwScore of [180, 180, 141]) {
        await matchCenterScreen.enterScore(throwScore)
      }
      await matchCenterScreen.finishLeg(3)

      // 1-0: not decided yet (best of 3 needs 2) - still on this game, next
      // leg already under way at a fresh 501.
      await expect(matchCenterScreen.root).toBeVisible()
      await expect(gameSummaryPanel.root).not.toBeVisible()
      await expect(matchCenterScreen.turnRemaining).toHaveText('501')

      // Leg 2 (Win): 2-0 now decides it outright - leg 3 is never played.
      for (const throwScore of [180, 180, 141]) {
        await matchCenterScreen.enterScore(throwScore)
      }
      await matchCenterScreen.finishLeg(3)

      await expect(gameSummaryPanel.root).toBeVisible({ timeout: 10_000 })
      const singles = gameSummaryPanel.gameBoxByType('Singles')
      await expect(singles).toContainText('Complete')

      // The actual point of lazy leg creation: a 2-0 decided best-of-3 must
      // have exactly 2 Leg documents, not a 3rd unused one left behind for
      // the leg that was never played.
      const gamesRes = await api.get(`/api/Match/${match.id}/games`)
      const games: { id: string; data: { type: string; playerIds: string[] } }[] = await gamesRes.json()
      const decidedSingles = games.find((g) => g.data.type === 'Singles' && g.data.playerIds?.includes(players[0]!.id))!
      const legsRes = await api.get(`/api/Game/${decidedSingles.id}/legs`)
      const legs: unknown[] = await legsRes.json()
      expect(legs).toHaveLength(2)
    })

    await test.step('viewing a Complete game shows its last leg, read-only', async () => {
      // Reopens the Singles game finished in the previous step.
      await gameSummaryPanel.gameBoxByType('Singles').click()
      await expect(matchCenterScreen.root).toBeVisible()

      expect(await matchCenterScreen.isReadonly()).toBe(true)
      // Leg 2 (the last one actually played - leg 3 stayed Pending) was
      // checked out, so its final remaining score was 0.
      await expect(matchCenterScreen.turnRemaining).toHaveText('0')

      // Both played legs (2-0, decided) show as their own tabs, both Won -
      // there's no "live" leg once the whole game is Complete, and nothing
      // is ever editable here regardless of which tab is selected.
      await expect(matchCenterScreen.legTabs).toHaveCount(2)
      await expect(matchCenterScreen.legTab(0)).toHaveClass(/win/)
      await expect(matchCenterScreen.legTab(1)).toHaveClass(/win/)
      await expect(matchCenterScreen.legFinalSummary).toContainText('Leg 2 — Won')
      await expect(matchCenterScreen.ledgerEditableScores).toHaveCount(0)

      await matchCenterScreen.legTab(0).click()
      await expect(matchCenterScreen.legFinalSummary).toContainText('Leg 1 — Won')
      await expect(matchCenterScreen.ledgerEditableScores).toHaveCount(0)

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('viewing an In Progress game resumes on the current leg, not a fresh one', async () => {
      const secondSingles = gameSummaryPanel.gameBoxByType('Singles', 1)
      await secondSingles.click()
      await selectPlayersGameScreen.selectPlayer(0, players[1]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      await gameSummaryPanel.gameBoxByType('Singles', 1).click()
      await matchCenterScreen.startGame()

      // Win leg 1 (1-0, not decided), then make partial progress into leg 2
      // and leave without finishing it.
      for (const throwScore of [180, 180, 141]) {
        await matchCenterScreen.enterScore(throwScore)
      }
      await matchCenterScreen.finishLeg(3)
      await expect(matchCenterScreen.turnRemaining).toHaveText('501')

      await matchCenterScreen.enterScore(100)
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      // Leave mid-leg via Back (available while started, not just in the
      // read-only view) - the leg stays Started server-side, unfinished.
      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      // Reopening must resume on leg 2's actual progress (401), not reset to
      // a fresh leg (501) or leg 1's now-irrelevant final state (0).
      await gameSummaryPanel.gameBoxByType('Singles', 1).click()
      await expect(matchCenterScreen.root).toBeVisible()
      expect(await matchCenterScreen.isReadonly()).toBe(false)
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      // Leg history tabs: leg 1 (Won) and leg 2 (the active, live one) both
      // show up now that this game has more than one leg. The active tab is
      // selected by default and nothing is flagged read-only yet.
      await expect(matchCenterScreen.legTabs).toHaveCount(2)
      await expect(matchCenterScreen.legTab(1)).toHaveClass(/active/)
      await expect(matchCenterScreen.viewingHistoryNote).not.toBeVisible()
      await expect(matchCenterScreen.ledgerEditableScores.first()).toBeVisible()

      // Switching to leg 1's tab shows its own completed throws, read-only -
      // and must NOT disturb leg 2's live remaining score shown above the ledger.
      await matchCenterScreen.legTab(0).click()
      await expect(matchCenterScreen.viewingHistoryNote).toBeVisible()
      await expect(matchCenterScreen.legFinalSummary).toContainText('Leg 1 — Won')
      await expect(matchCenterScreen.ledgerEditableScores).toHaveCount(0)
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      // Switching back to the active leg's own tab returns to the live, editable view.
      await matchCenterScreen.legTab(1).click()
      await expect(matchCenterScreen.viewingHistoryNote).not.toBeVisible()
      await expect(matchCenterScreen.ledgerEditableScores.first()).toBeVisible()

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      // Reopening the game later resets the view back to the active leg,
      // rather than staying on whichever tab was last clicked.
      await gameSummaryPanel.gameBoxByType('Singles', 1).click()
      await expect(matchCenterScreen.legTab(1)).toHaveClass(/active/)
      await expect(matchCenterScreen.viewingHistoryNote).not.toBeVisible()

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('players can be changed while a game is Ready, but the roster locks once it is In Progress', async () => {
      // Uses a Singles game untouched by any earlier step (index 2 - indices
      // 0 and 1 are already Complete/mid-leg from steps above), so changing
      // and then starting it here can't interfere with anything later.
      await gameSummaryPanel.gameBoxByType('Singles', 2).click()
      await selectPlayersGameScreen.selectPlayer(0, players[3]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      // Reopening a Ready game goes straight to MatchCenter; Edit Players
      // reopens selection pre-filled with the roster just saved, and a
      // change here actually updates the game once saved again.
      await gameSummaryPanel.gameBoxByType('Singles', 2).click()
      await expect(matchCenterScreen.root).toBeVisible()
      await matchCenterScreen.editPlayersButton.click()
      expect(await selectPlayersGameScreen.selectedPlayerName(0)).toBe(players[3]!.name)

      await selectPlayersGameScreen.selectPlayer(0, players[4]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
      await expect(gameSummaryPanel.gameBoxByType('Singles', 2)).toContainText(players[4]!.name)

      // Once started (In Progress), the roster is locked in - no Edit
      // Players option in the UI, and the server rejects a direct attempt too.
      await gameSummaryPanel.gameBoxByType('Singles', 2).click()
      await matchCenterScreen.startGame()
      await expect(matchCenterScreen.editPlayersButton).not.toBeVisible()

      // Identified by its assigned player rather than type+order+status:
      // Singles(1) is also already In Progress (left mid-leg by an earlier
      // step), so "the Singles game just started" isn't unique without this.
      const gamesRes = await api.get(`/api/Match/${match.id}/games`)
      const games: { id: string; data: { type: string; playerIds: string[] } }[] = await gamesRes.json()
      const startedGame = games.find((g) => g.data.type === 'Singles' && g.data.playerIds?.includes(players[4]!.id))!

      const res = await api.put(`/api/Game/${startedGame.id}/update-players`, {
        data: { selectedPlayers: [players[0]!.id] },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.detail).toContain('already started')

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('the bull-off prompt names the real players, and the recorded result can be corrected via the header chip', async () => {
      // Trebles(1) - untouched by any earlier step. Uses players[3..5]:
      // players[0..2] are already assigned to Trebles(0) (see "Finish
      // completes a leg as a Loss" above), and with all 6 players available
      // (no headcount shortage), a player can't be selected for more than
      // one game of the same type.
      await gameSummaryPanel.gameBoxByType('Trebles', 1).click()
      await selectPlayersGameScreen.selectPlayer(0, players[3]!.name)
      await selectPlayersGameScreen.selectPlayer(1, players[4]!.name)
      await selectPlayersGameScreen.selectPlayer(2, players[5]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()

      await gameSummaryPanel.gameBoxByType('Trebles', 1).click()
      await matchCenterScreen.startButton.click()
      await expect(matchCenterScreen.wonBullDialog).toBeVisible()

      // Regression test: the dialog used to hardcode the literal word
      // "Player" instead of naming any of this game's actual players.
      await expect(matchCenterScreen.wonBullQuestion).toContainText(players[3]!.name)
      await expect(matchCenterScreen.wonBullQuestion).toContainText(players[4]!.name)
      await expect(matchCenterScreen.wonBullQuestion).toContainText(players[5]!.name)

      await matchCenterScreen.wonBullYesButton.click()
      await expect(matchCenterScreen.wonBullDialog).not.toBeVisible()
      await expect(matchCenterScreen.bullResultChip).toHaveText(/Bull: Won/)

      // Corrects a mis-click via the header chip, reusing the same dialog.
      await matchCenterScreen.editBullResult(false)
      await expect(matchCenterScreen.bullResultChip).toHaveText(/Bull: Lost/)

      // The correction is a real server round-trip, not just local UI state -
      // reopening the game (still In Progress, mid-leg) reflects it too.
      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
      await gameSummaryPanel.gameBoxByType('Trebles', 1).click()
      await expect(matchCenterScreen.bullResultChip).toHaveText(/Bull: Lost/)

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('a player already assigned to another game of the same type cannot be selected again (6 players available)', async () => {
      // Doubles(2) - untouched by any earlier step. Doubles(0) already used
      // players[0]/[1] and Doubles(1) already used players[2]/[3] - with all
      // 6 players available (no headcount shortage), none of those four can
      // be picked again here.
      await gameSummaryPanel.gameBoxByType('Doubles', 2).click()
      await expect(selectPlayersGameScreen.root).toBeVisible()

      const firstDropdown = selectPlayersGameScreen.playerDropdowns.nth(0)
      for (const usedPlayer of [players[0]!, players[1]!, players[2]!, players[3]!]) {
        const option = firstDropdown.locator('option', { hasText: usedPlayer.name })
        await expect(option).toBeDisabled()
        await expect(option).toHaveText(`${usedPlayer.name} (already playing)`)
      }

      // The two players not yet used in any Doubles game remain selectable.
      await selectPlayersGameScreen.selectPlayer(0, players[4]!.name)
      await selectPlayersGameScreen.selectPlayer(1, players[5]!.name)
      await selectPlayersGameScreen.saveButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('switching games via the in-match drawer updates both the highlight and the Ready/In-Progress screen', async () => {
      // Singles(1) is still In Progress (left mid-leg earlier), Doubles(2)
      // is still Ready (assigned in the previous step, never started) - a
      // good pair to switch between via the drawer without playing either
      // out further.
      await gameSummaryPanel.gameBoxByType('Singles', 1).click()
      await expect(matchCenterScreen.root).toBeVisible()
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      await matchCenterScreen.openGamesDrawer()
      await gameSummaryPanel.gameBoxByType('Doubles', 2).click()

      // Regression: MatchCenter used to alias its `game` prop into a
      // one-time local const, so switching games via the drawer never
      // actually changed what the console displayed - it kept showing
      // Singles(1)'s active scoring keypad instead of Doubles(2)'s
      // "Ready to start" screen (looking blank/broken).
      await expect(matchCenterScreen.gamesDrawer).not.toBeVisible()
      await expect(matchCenterScreen.nextPlayerHeading).toHaveText('Ready to start')
      await expect(matchCenterScreen.startButton).toBeVisible()
      await expect(matchCenterScreen.submitScoreButton).not.toBeVisible()

      // Regression: the drawer's own highlight was frozen on whichever game
      // was selected when MatchCenter first mounted - reopening it should
      // now show Doubles(2), not the original Singles(1), as selected.
      await matchCenterScreen.openGamesDrawer()
      await expect(gameSummaryPanel.gameBoxByType('Doubles', 2)).toHaveClass(/selected/)
      await expect(gameSummaryPanel.gameBoxByType('Singles', 1)).not.toHaveClass(/selected/)
      await matchCenterScreen.gamesDrawerClose.click()

      // Doubles(2) is Ready but not started, so "Cancel" (not "Back") is
      // what's visible here - leaves its roster untouched, still Ready for
      // the rest of the test.
      await matchCenterScreen.cancelButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
    })

    await test.step('leaving via Home saves in-progress leg data, so it can be resumed after the client state is lost', async () => {
      // Singles(1) is still mid-leg2 at remaining=401 (left there earlier
      // via Back, never finished).
      await gameSummaryPanel.gameBoxByType('Singles', 1).click()
      await expect(matchCenterScreen.root).toBeVisible()
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      await menuBar.homeLink.click()

      // handleNavigate() awaits saveActiveLegProgress() before switching
      // views (MenuBar's click handler itself isn't awaited by Playwright's
      // click(), which only waits for the click action, not arbitrary async
      // work it triggers) - the Play Match button only appearing here means
      // that save has actually completed, so the API check below isn't
      // racing it.
      await expect(launchScreen.playMatchButton).toBeVisible()

      // Regression: leaving mid-leg used to lose all progress not yet sent
      // to the server - only completeLeg() ever wrote score data, so the
      // throws recorded so far existed only in this browser's local store.
      // Home should now save them first.
      const gamesRes = await api.get(`/api/Match/${match.id}/games`)
      const games: { id: string; data: { type: string; playerIds: string[] } }[] = await gamesRes.json()
      const singlesGame = games.find((g) => g.data.type === 'Singles' && g.data.playerIds?.includes(players[1]!.id))!
      const legsRes = await api.get(`/api/Game/${singlesGame.id}/legs`)
      const legs: { data: { status: string; score: { playerId: string; score: number }[] } }[] = await legsRes.json()
      const startedLeg = legs.find((l) => l.data.status === 'Started')!
      expect(startedLeg).toBeTruthy()
      const totalScored = startedLeg.data.score.reduce((sum, s) => sum + s.score, 0)
      expect(501 - totalScored).toBe(401)

      // Simulate genuinely losing the client's own state (a different
      // device, or the store's own 6-hour expiry) rather than just this
      // same tab reloading - clear localStorage entirely before returning.
      await page.evaluate(() => localStorage.clear())
      await page.reload()

      await launchScreen.waitUntilLoaded()
      await launchScreen.clickPlayMatch()
      await availablePlayersScreen.waitUntilLoaded()
      // The roster was already confirmed - re-submitting the same selection
      // is a harmless no-op, just re-establishing the client's own local state.
      await expect(await availablePlayersScreen.selectedPlayerCount()).toBe(players.length)
      await availablePlayersScreen.proceed()

      await expect(gameSummaryPanel.root).toBeVisible()
      await gameSummaryPanel.gameBoxByType('Singles', 1).click()

      // The resumed leg must reflect the real saved progress, not a blank
      // fresh leg.
      await expect(matchCenterScreen.root).toBeVisible()
      await expect(matchCenterScreen.turnRemaining).toHaveText('401')

      await matchCenterScreen.backButton.click()
      await expect(gameSummaryPanel.root).toBeVisible()
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
