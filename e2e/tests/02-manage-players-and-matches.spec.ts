import { test, expect } from '../fixtures/test'
import { createPlayer, createScheduledMatch } from '../fixtures/api-client'

// Numbered so this runs after 01-start-next-match.spec.ts: both journeys here
// create real players/matches, which would otherwise pollute that file's
// "no next match yet" and "exactly N players" preconditions. See
// fixtures/test.ts's note on the shared player list, and BUGS.md on why
// cross-file Playwright ordering needs this kind of explicit help.
test.describe('New Player journey', () => {
  test('adding a player shows a confirmation and clears the form', async ({
    page,
    launchScreen,
    menuBar,
    newPlayerScreen,
  }) => {
    const playerName = `E2E New Player ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await menuBar.openNewPlayerForm()
    await expect(newPlayerScreen.nameInput).toBeVisible()

    await newPlayerScreen.addPlayer(playerName)

    await expect(newPlayerScreen.successMessage).toContainText(playerName)
    await expect(newPlayerScreen.nameInput).toHaveValue('')
    await expect(page.locator('.error-toast')).not.toBeVisible()

    await newPlayerScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('rejects a blank name without calling the API', async ({ page, launchScreen, menuBar, newPlayerScreen }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    let apiCalled = false
    await page.route('**/api/Player', (route) => {
      apiCalled = true
      return route.continue()
    })

    await newPlayerScreen.submitButton.click()

    await expect(newPlayerScreen.errorMessage).toHaveText('Name is required')
    await expect(newPlayerScreen.successMessage).not.toBeVisible()
    expect(apiCalled).toBe(false)
  })

  test('the name field cannot exceed 100 characters', async ({ launchScreen, menuBar, newPlayerScreen }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    // The input's maxlength attribute enforces this at the browser level, so
    // typing past it is a no-op - the over-length *rejection logic* itself
    // (for input that reaches the server some other way) is unit-tested
    // directly in src/validation/__tests__/playerValidation.spec.ts.
    await newPlayerScreen.nameInput.fill('a'.repeat(150))

    await expect(newPlayerScreen.nameInput).toHaveValue('a'.repeat(100))
  })

  test('a newly added player appears in the table', async ({ launchScreen, menuBar, newPlayerScreen }) => {
    const playerName = `E2E Table Player ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    await newPlayerScreen.addPlayer(playerName)
    await expect(newPlayerScreen.successMessage).toContainText(playerName)

    // Players are ordered by Id (not insertion order), so this searches
    // across pages rather than assuming page 1.
    const row = await newPlayerScreen.findRowByName(playerName)
    await expect(row).toBeVisible()
  })

  test('editing a player renames them in the table', async ({ api, launchScreen, menuBar, newPlayerScreen }) => {
    const original = await createPlayer(api, `E2E Edit Original ${Date.now()}`)
    const updatedName = `E2E Edit Updated ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    await newPlayerScreen.editPlayer(original.name)
    await expect(newPlayerScreen.nameInput).toHaveValue(original.name)
    await expect(newPlayerScreen.submitButton).toHaveText('Save Changes')

    await newPlayerScreen.nameInput.fill(updatedName)
    await newPlayerScreen.submitButton.click()

    await expect(newPlayerScreen.successMessage).toContainText(updatedName)
    await expect(newPlayerScreen.rowByName(original.name)).toHaveCount(0)
    const row = await newPlayerScreen.findRowByName(updatedName)
    await expect(row).toBeVisible()
  })

  test('cancelling an edit leaves the player unchanged', async ({ api, launchScreen, menuBar, newPlayerScreen }) => {
    const player = await createPlayer(api, `E2E Cancel Edit ${Date.now()}`)

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    await newPlayerScreen.editPlayer(player.name)
    await newPlayerScreen.nameInput.fill('should not be saved')
    await newPlayerScreen.cancelEditButton.click()

    await expect(newPlayerScreen.nameInput).toHaveValue('')
    await expect(newPlayerScreen.submitButton).toHaveText('Add Player')
    const row = await newPlayerScreen.findRowByName(player.name)
    await expect(row).toBeVisible()
  })

  test('deleting a player removes them from the table', async ({ api, launchScreen, menuBar, newPlayerScreen }) => {
    const player = await createPlayer(api, `E2E Delete Me ${Date.now()}`)

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()

    await newPlayerScreen.deletePlayer(player.name)

    await expect(newPlayerScreen.rowByName(player.name)).toHaveCount(0)
  })

  test('pagination shows at most 10 players per page and lets you navigate', async ({
    api,
    launchScreen,
    menuBar,
    newPlayerScreen,
  }) => {
    // Top up to at least 11 total players, regardless of how many other
    // tests in this run have already created some, so there's guaranteed
    // to be a second page.
    const existing = await (await api.get('/api/Player?take=500')).json()
    const runId = Date.now()
    for (let i = existing.length; i < 11; i++) {
      await createPlayer(api, `E2E Pagination Filler ${runId} ${i}`)
    }

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewPlayerForm()
    await newPlayerScreen.waitUntilTableLoaded()

    await expect(newPlayerScreen.rows).toHaveCount(10)
    await expect(newPlayerScreen.pageIndicator).toHaveText('Page 1')
    await expect(newPlayerScreen.prevPageButton).toBeDisabled()
    await expect(newPlayerScreen.nextPageButton).toBeEnabled()
    const firstPage = await newPlayerScreen.rows.allTextContents()

    await newPlayerScreen.nextPageButton.click()
    await newPlayerScreen.waitUntilTableLoaded()

    await expect(newPlayerScreen.pageIndicator).toHaveText('Page 2')
    await expect(newPlayerScreen.prevPageButton).toBeEnabled()
    const secondPage = await newPlayerScreen.rows.allTextContents()
    expect(secondPage).not.toEqual(firstPage)

    await newPlayerScreen.prevPageButton.click()
    await newPlayerScreen.waitUntilTableLoaded()
    await expect(newPlayerScreen.pageIndicator).toHaveText('Page 1')
    await expect(newPlayerScreen.rows.allTextContents()).resolves.toEqual(firstPage)
  })
})

test.describe('New Match journey', () => {
  test('scheduling a match shows a confirmation and clears the form', async ({
    page,
    launchScreen,
    menuBar,
    newMatchScreen,
  }) => {
    const opponent = `E2E New Match Opponent ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await menuBar.openNewMatchForm()
    await expect(newMatchScreen.opponentInput).toBeVisible()

    await newMatchScreen.fill({ opponent, date: '2026-09-15', location: 'Away' })
    await newMatchScreen.submit()

    await expect(newMatchScreen.successMessage).toContainText(opponent)
    await expect(newMatchScreen.opponentInput).toHaveValue('')
    await expect(page.locator('.error-toast')).not.toBeVisible()

    await newMatchScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('reports every missing field at once without calling the API', async ({
    page,
    launchScreen,
    menuBar,
    newMatchScreen,
  }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewMatchForm()

    let apiCalled = false
    await page.route('**/api/Match', (route) => {
      apiCalled = true
      return route.continue()
    })

    // Location defaults to "Home", so only opponent/date are left blank.
    await newMatchScreen.submit()

    await expect(newMatchScreen.opponentError).toHaveText('Opponent is required')
    await expect(newMatchScreen.dateError).toHaveText('Date is required')
    expect(apiCalled).toBe(false)
  })

  test('a newly added match appears in the table', async ({ launchScreen, menuBar, newMatchScreen }) => {
    const opponent = `E2E Table Match ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewMatchForm()

    await newMatchScreen.fill({ opponent, date: '2026-10-01', location: 'Home' })
    await newMatchScreen.submit()
    await expect(newMatchScreen.successMessage).toContainText(opponent)

    // Matches are ordered by Id (not insertion order), so this searches
    // across pages rather than assuming page 1.
    const row = await newMatchScreen.findRowByOpponent(opponent)
    await expect(row).toBeVisible()
    await expect(row).toContainText('Scheduled')
  })

  test('editing a Scheduled match updates it in the table', async ({ api, launchScreen, menuBar, newMatchScreen }) => {
    const original = await createScheduledMatch(api, { opponent: `E2E Edit Match Original ${Date.now()}`, location: 'Home' })
    const updatedOpponent = `E2E Edit Match Updated ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewMatchForm()

    await newMatchScreen.editMatch(original.opponent)
    await expect(newMatchScreen.opponentInput).toHaveValue(original.opponent)
    await expect(newMatchScreen.submitButton).toHaveText('Save Changes')

    await newMatchScreen.fill({ opponent: updatedOpponent, date: '2026-11-20', location: 'Away' })
    await newMatchScreen.submit()

    await expect(newMatchScreen.successMessage).toContainText(updatedOpponent)
    await expect(newMatchScreen.rowByOpponent(original.opponent)).toHaveCount(0)
    const row = await newMatchScreen.findRowByOpponent(updatedOpponent)
    await expect(row).toContainText('Away')
  })

  test('deleting a Scheduled match removes it from the table', async ({ api, launchScreen, menuBar, newMatchScreen }) => {
    const match = await createScheduledMatch(api, { opponent: `E2E Delete Match ${Date.now()}` })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewMatchForm()

    await newMatchScreen.deleteMatch(match.opponent)

    await expect(newMatchScreen.rowByOpponent(match.opponent)).toHaveCount(0)
  })

  test('a match that is not Scheduled cannot be edited or deleted', async ({ launchScreen, menuBar, newMatchScreen }) => {
    // 01-start-next-match.spec.ts leaves exactly one match permanently In
    // Progress (its games are never played out to completion) - reusing it
    // here avoids driving a second match through the whole start/roster flow
    // just to get a non-Scheduled row to test against.
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewMatchForm()

    const row = await newMatchScreen.findRowByOpponent('InProgress')
    await expect(row.locator('[data-testid="match-edit-btn"]')).toHaveCount(0)
    await expect(row.locator('[data-testid="match-delete-btn"]')).toHaveCount(0)
  })
})

// Deliberately not covered here: "a newly created match becomes the next
// match shown". By this point in the run, 01-start-next-match.spec.ts has
// already left a match permanently In Progress (its games are never played
// out to completion), and GetNextMatch always prefers an In Progress match
// over any Scheduled one - so that assertion can't hold given this suite's
// shared database within a single run. The creation journey itself (happy
// path + validation, above) is what this file is responsible for; which
// match GetNextMatch picks is 01's concern.
