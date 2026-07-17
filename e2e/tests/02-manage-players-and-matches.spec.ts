import { test, expect } from '../fixtures/test'

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
})

// Deliberately not covered here: "a newly created match becomes the next
// match shown". By this point in the run, 01-start-next-match.spec.ts has
// already left a match permanently In Progress (its games are never played
// out to completion), and GetNextMatch always prefers an In Progress match
// over any Scheduled one - so that assertion can't hold given this suite's
// shared database within a single run. The creation journey itself (happy
// path + validation, above) is what this file is responsible for; which
// match GetNextMatch picks is 01's concern.
