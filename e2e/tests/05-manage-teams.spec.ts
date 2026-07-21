import { test, expect } from '../fixtures/test'
import { createTeam } from '../fixtures/api-client'

test.describe('New Team journey', () => {
  test('adding a team shows a confirmation and clears the form', async ({
    page,
    launchScreen,
    menuBar,
    newTeamScreen,
  }) => {
    const name = `E2E New Team ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await menuBar.openNewTeamForm()
    await expect(newTeamScreen.nameInput).toBeVisible()

    await newTeamScreen.addTeam(name)

    await expect(newTeamScreen.successMessage).toContainText(name)
    await expect(newTeamScreen.nameInput).toHaveValue('')
    await expect(page.locator('.error-toast')).not.toBeVisible()

    await newTeamScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('rejects a blank name without calling the API', async ({ page, launchScreen, menuBar, newTeamScreen }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewTeamForm()

    let apiCalled = false
    await page.route('**/api/Team', (route) => {
      apiCalled = true
      return route.continue()
    })

    await newTeamScreen.submitButton.click()

    await expect(newTeamScreen.errorMessage).toHaveText('Name is required')
    await expect(newTeamScreen.successMessage).not.toBeVisible()
    expect(apiCalled).toBe(false)
  })

  test('a newly added team appears in the table', async ({ launchScreen, menuBar, newTeamScreen }) => {
    const name = `E2E Table Team ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewTeamForm()

    await newTeamScreen.addTeam(name)
    await expect(newTeamScreen.successMessage).toContainText(name)

    const row = await newTeamScreen.findRowByName(name)
    await expect(row).toBeVisible()
  })

  test('editing a team renames it in the table', async ({ api, launchScreen, menuBar, newTeamScreen }) => {
    const original = await createTeam(api, `E2E Edit Team Original ${Date.now()}`)
    const updatedName = `E2E Edit Team Updated ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewTeamForm()

    await newTeamScreen.editTeam(original.name)
    await expect(newTeamScreen.nameInput).toHaveValue(original.name)
    await expect(newTeamScreen.submitButton).toHaveText('Save Changes')

    await newTeamScreen.nameInput.fill(updatedName)
    await newTeamScreen.submitButton.click()

    await expect(newTeamScreen.successMessage).toContainText(updatedName)
    await expect(newTeamScreen.rowByName(original.name)).toHaveCount(0)
    const row = await newTeamScreen.findRowByName(updatedName)
    await expect(row).toBeVisible()
  })

  test('deleting a team removes it from the table', async ({ api, launchScreen, menuBar, newTeamScreen }) => {
    const team = await createTeam(api, `E2E Delete Team ${Date.now()}`)

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewTeamForm()

    await newTeamScreen.deleteTeam(team.name)

    await expect(newTeamScreen.rowByName(team.name)).toHaveCount(0)
  })

  test('a team that a player belongs to cannot be deleted', async ({ api, launchScreen, menuBar, newTeamScreen }) => {
    const team = await createTeam(api, `E2E Locked Team ${Date.now()}`)
    await api.post('/api/Player', { data: { name: `E2E Locked Team Player ${Date.now()}`, teamId: team.id } })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewTeamForm()

    const row = await newTeamScreen.findRowByName(team.name)
    await row.locator('[data-testid="team-delete-btn"]').click()
    await row.locator('[data-testid="team-confirm-delete"]').click()

    // The server rejects the delete (a Player still belongs to this team) -
    // surfaced via the global error toast, and the row must still be there.
    await expect(row).toBeVisible()
  })
})
