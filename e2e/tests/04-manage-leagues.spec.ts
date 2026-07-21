import { test, expect } from '../fixtures/test'
import { createLeague } from '../fixtures/api-client'

test.describe('New League journey', () => {
  test('adding a league shows a confirmation and clears the form', async ({
    page,
    launchScreen,
    menuBar,
    newLeagueScreen,
  }) => {
    const name = `E2E New League ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await menuBar.openNewLeagueForm()
    await expect(newLeagueScreen.nameInput).toBeVisible()

    await newLeagueScreen.fill({
      name,
      numTrebles: 2, numDoubles: 3, numSingles: 6,
      treblesLegs: 1, doublesLegs: 1, singlesLegs: 3,
      treblesStartScore: 701, doublesStartScore: 601, singlesStartScore: 501,
      maxRounds: 17,
    })
    await newLeagueScreen.submit()

    await expect(newLeagueScreen.successMessage).toContainText(name)
    await expect(newLeagueScreen.nameInput).toHaveValue('')
    await expect(page.locator('.error-toast')).not.toBeVisible()

    await newLeagueScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('reports every failing field at once without calling the API', async ({
    page,
    launchScreen,
    menuBar,
    newLeagueScreen,
  }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewLeagueForm()

    let apiCalled = false
    await page.route('**/api/League', (route) => {
      apiCalled = true
      return route.continue()
    })

    // Zero out every game count (invalid: at least one game type must be
    // non-zero) and drop a leg count/start score/maxRounds below their
    // minimums, leaving the name blank too.
    await newLeagueScreen.fill({
      name: '',
      numTrebles: 0, numDoubles: 0, numSingles: 0,
      singlesLegs: 0,
      doublesStartScore: 0,
      maxRounds: 0,
    })
    await newLeagueScreen.submit()

    await expect(newLeagueScreen.nameError).toHaveText('Name is required')
    await expect(newLeagueScreen.gameCountsError).toBeVisible()
    await expect(newLeagueScreen.legCountsError).toBeVisible()
    await expect(newLeagueScreen.startScoresError).toBeVisible()
    await expect(newLeagueScreen.maxRoundsError).toBeVisible()
    expect(apiCalled).toBe(false)
  })

  test('a league with no max rounds configured shows "No limit" in the table', async ({
    launchScreen,
    menuBar,
    newLeagueScreen,
  }) => {
    const name = `E2E No Limit League ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewLeagueForm()

    await newLeagueScreen.fill({
      name,
      numTrebles: 2, numDoubles: 3, numSingles: 6,
      treblesLegs: 1, doublesLegs: 1, singlesLegs: 3,
      treblesStartScore: 701, doublesStartScore: 601, singlesStartScore: 501,
      maxRounds: '',
    })
    await newLeagueScreen.submit()
    await expect(newLeagueScreen.successMessage).toContainText(name)

    const row = await newLeagueScreen.findRowByName(name)
    await expect(row).toContainText('No limit')
  })

  test('editing a league renames it in the table', async ({ api, launchScreen, menuBar, newLeagueScreen }) => {
    const original = await createLeague(api, { name: `E2E Edit League Original ${Date.now()}` })
    const updatedName = `E2E Edit League Updated ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewLeagueForm()

    await newLeagueScreen.editLeague(original.name)
    await expect(newLeagueScreen.nameInput).toHaveValue(original.name)
    await expect(newLeagueScreen.submitButton).toHaveText('Save Changes')

    await newLeagueScreen.fill({ name: updatedName })
    await newLeagueScreen.submit()

    await expect(newLeagueScreen.successMessage).toContainText(updatedName)
    await expect(newLeagueScreen.rowByName(original.name)).toHaveCount(0)
    const row = await newLeagueScreen.findRowByName(updatedName)
    await expect(row).toBeVisible()
  })

  test('deleting a league removes it from the table', async ({ api, launchScreen, menuBar, newLeagueScreen }) => {
    const league = await createLeague(api, { name: `E2E Delete League ${Date.now()}` })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewLeagueForm()

    await newLeagueScreen.deleteLeague(league.name)

    await expect(newLeagueScreen.rowByName(league.name)).toHaveCount(0)
  })

  test('a league that a season is linked to cannot be deleted', async ({
    api,
    launchScreen,
    menuBar,
    newLeagueScreen,
  }) => {
    const league = await createLeague(api, { name: `E2E Locked League ${Date.now()}` })
    const teamRes = await api.post('/api/Team', { data: { name: `E2E Locked League Team ${Date.now()}` } })
    const team = await teamRes.json()
    await api.post('/api/Season', {
      data: { name: `E2E Locked League Season ${Date.now()}`, leagueId: league.id, teamId: team.id },
    })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewLeagueForm()

    const row = await newLeagueScreen.findRowByName(league.name)
    await row.locator('[data-testid="league-delete-btn"]').click()
    await row.locator('[data-testid="league-confirm-delete"]').click()

    // The server rejects the delete (Season still linked) - surfaced via the
    // global error toast, and the row must still be there.
    await expect(row).toBeVisible()
  })
})
