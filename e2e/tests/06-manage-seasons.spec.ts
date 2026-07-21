import { test, expect } from '../fixtures/test'
import { createLeague, createTeam, createSeason } from '../fixtures/api-client'

test.describe('New Season journey', () => {
  test('adding a season shows a confirmation and clears the form', async ({
    page,
    api,
    launchScreen,
    menuBar,
    newSeasonScreen,
  }) => {
    const league = await createLeague(api, { name: `E2E Season League ${Date.now()}` })
    const team = await createTeam(api, `E2E Season Team ${Date.now()}`)
    const name = `E2E New Season ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()

    await menuBar.openNewSeasonForm()
    await expect(newSeasonScreen.nameInput).toBeVisible()

    await newSeasonScreen.fill({ name, leagueName: league.name, teamName: team.name })
    await newSeasonScreen.submit()

    await expect(newSeasonScreen.successMessage).toContainText(name)
    await expect(newSeasonScreen.nameInput).toHaveValue('')
    await expect(page.locator('.error-toast')).not.toBeVisible()

    await newSeasonScreen.doneButton.click()
    await expect(launchScreen.playMatchButton).toBeVisible()
  })

  test('reports every missing field at once without calling the API', async ({
    page,
    launchScreen,
    menuBar,
    newSeasonScreen,
  }) => {
    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewSeasonForm()

    let apiCalled = false
    await page.route('**/api/Season', (route) => {
      apiCalled = true
      return route.continue()
    })

    await newSeasonScreen.submit()

    await expect(newSeasonScreen.nameError).toHaveText('Name is required')
    await expect(newSeasonScreen.leagueError).toHaveText('League is required')
    await expect(newSeasonScreen.teamError).toHaveText('Team is required')
    expect(apiCalled).toBe(false)
  })

  test('a newly added season appears in the table with its league, team, and Active status', async ({
    api,
    launchScreen,
    menuBar,
    newSeasonScreen,
  }) => {
    const league = await createLeague(api, { name: `E2E Table Season League ${Date.now()}` })
    const team = await createTeam(api, `E2E Table Season Team ${Date.now()}`)
    const name = `E2E Table Season ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewSeasonForm()

    await newSeasonScreen.fill({ name, leagueName: league.name, teamName: team.name })
    await newSeasonScreen.submit()
    await expect(newSeasonScreen.successMessage).toContainText(name)

    const row = await newSeasonScreen.findRowByName(name)
    await expect(row).toContainText(league.name)
    await expect(row).toContainText(team.name)
    await expect(row).toContainText('Active')
  })

  test('editing a season renames it in the table', async ({ api, launchScreen, menuBar, newSeasonScreen }) => {
    const league = await createLeague(api, { name: `E2E Edit Season League ${Date.now()}` })
    const team = await createTeam(api, `E2E Edit Season Team ${Date.now()}`)
    const original = await createSeason(api, { name: `E2E Edit Season Original ${Date.now()}`, leagueId: league.id, teamId: team.id })
    const updatedName = `E2E Edit Season Updated ${Date.now()}`

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewSeasonForm()

    await newSeasonScreen.editSeason(original.name)
    await expect(newSeasonScreen.nameInput).toHaveValue(original.name)
    await expect(newSeasonScreen.submitButton).toHaveText('Save Changes')

    await newSeasonScreen.fill({ name: updatedName })
    await newSeasonScreen.submit()

    await expect(newSeasonScreen.successMessage).toContainText(updatedName)
    await expect(newSeasonScreen.rowByName(original.name)).toHaveCount(0)
    const row = await newSeasonScreen.findRowByName(updatedName)
    await expect(row).toBeVisible()
  })

  test('deleting a season removes it from the table', async ({ api, launchScreen, menuBar, newSeasonScreen }) => {
    const league = await createLeague(api, { name: `E2E Delete Season League ${Date.now()}` })
    const team = await createTeam(api, `E2E Delete Season Team ${Date.now()}`)
    const season = await createSeason(api, { name: `E2E Delete Season ${Date.now()}`, leagueId: league.id, teamId: team.id })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewSeasonForm()

    await newSeasonScreen.deleteSeason(season.name)

    await expect(newSeasonScreen.rowByName(season.name)).toHaveCount(0)
  })

  test('a season that a match is linked to cannot be deleted, and its league/team can no longer be changed', async ({
    api,
    launchScreen,
    menuBar,
    newSeasonScreen,
  }) => {
    const league = await createLeague(api, { name: `E2E Locked Season League ${Date.now()}` })
    const otherLeague = await createLeague(api, { name: `E2E Locked Season Other League ${Date.now()}` })
    const team = await createTeam(api, `E2E Locked Season Team ${Date.now()}`)
    const season = await createSeason(api, { name: `E2E Locked Season ${Date.now()}`, leagueId: league.id, teamId: team.id })
    await api.post('/api/Match', {
      data: {
        status: 'Scheduled',
        opponent: `E2E Locked Season Opponent ${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'Home',
        gamesFor: 0,
        gamesAgainst: 0,
        seasonId: season.id,
      },
    })

    await launchScreen.goto()
    await launchScreen.waitUntilLoaded()
    await menuBar.openNewSeasonForm()

    // Delete is rejected server-side (a Match still links to it) - surfaced
    // via the global error toast, row stays put.
    const row = await newSeasonScreen.findRowByName(season.name)
    await row.locator('[data-testid="season-delete-btn"]').click()
    await row.locator('[data-testid="season-confirm-delete"]').click()
    await expect(row).toBeVisible()

    // Changing the League once a Match exists is rejected too - the name
    // itself stays editable, but the League/Team edit is not.
    await newSeasonScreen.editSeason(season.name)
    await newSeasonScreen.leagueSelect.selectOption({ label: otherLeague.name })
    await newSeasonScreen.submit()

    await expect(newSeasonScreen.successMessage).not.toBeVisible()
  })
})
