import type { Locator, Page } from '@playwright/test'

export interface NewSeasonFormValues {
  name?: string
  leagueName?: string
  teamName?: string
}

/** POM for components/Manage/NewSeasonForm.vue - the season management table + add/edit form. */
export class NewSeasonScreen {
  readonly nameInput: Locator
  readonly leagueSelect: Locator
  readonly teamSelect: Locator
  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly cancelEditButton: Locator
  readonly successMessage: Locator
  readonly nameError: Locator
  readonly leagueError: Locator
  readonly teamError: Locator

  readonly loadingSpinner: Locator
  readonly rows: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator
  readonly pageIndicator: Locator

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('[data-testid="new-season-name-input"]')
    this.leagueSelect = page.locator('[data-testid="new-season-league-input"]')
    this.teamSelect = page.locator('[data-testid="new-season-team-input"]')
    this.submitButton = page.locator('[data-testid="new-season-submit"]')
    this.doneButton = page.locator('[data-testid="new-season-done"]')
    this.cancelEditButton = page.locator('[data-testid="new-season-cancel-edit"]')
    this.successMessage = page.locator('[data-testid="new-season-success"]')
    this.nameError = page.locator('[data-testid="new-season-name-error"]')
    this.leagueError = page.locator('[data-testid="new-season-league-error"]')
    this.teamError = page.locator('[data-testid="new-season-team-error"]')

    this.loadingSpinner = page.locator('.table-wrap .spinner')
    this.rows = page.locator('[data-testid="season-row"]')
    this.prevPageButton = page.locator('[data-testid="season-prev-page"]')
    this.nextPageButton = page.locator('[data-testid="season-next-page"]')
    this.pageIndicator = page.locator('[data-testid="season-page-indicator"]')
  }

  async fill(values: NewSeasonFormValues) {
    if (values.name !== undefined) await this.nameInput.fill(values.name)
    if (values.leagueName !== undefined) await this.leagueSelect.selectOption({ label: values.leagueName })
    if (values.teamName !== undefined) await this.teamSelect.selectOption({ label: values.teamName })
  }

  async submit() {
    await this.submitButton.click()
  }

  async waitUntilTableLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name })
  }

  /** Clicks "Next" until a row with this name is visible, or throws (seasons are ordered by Id, not insertion order). */
  async findRowByName(name: string, maxPages = 20): Promise<Locator> {
    for (let i = 0; i < maxPages; i++) {
      await this.waitUntilTableLoaded()
      const row = this.rowByName(name)
      if ((await row.count()) > 0) return row

      if (await this.nextPageButton.isDisabled()) break
      await this.nextPageButton.click()
    }
    throw new Error(`Season "${name}" not found within ${maxPages} page(s)`)
  }

  async editSeason(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="season-edit-btn"]').click()
  }

  async deleteSeason(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="season-delete-btn"]').click()
    await row.locator('[data-testid="season-confirm-delete"]').click()
  }
}
