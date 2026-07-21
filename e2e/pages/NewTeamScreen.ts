import type { Locator, Page } from '@playwright/test'

/** POM for components/Manage/NewTeamForm.vue - the team management table + add/edit form. */
export class NewTeamScreen {
  readonly nameInput: Locator
  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly cancelEditButton: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  readonly loadingSpinner: Locator
  readonly rows: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator
  readonly pageIndicator: Locator

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('[data-testid="new-team-name-input"]')
    this.submitButton = page.locator('[data-testid="new-team-submit"]')
    this.doneButton = page.locator('[data-testid="new-team-done"]')
    this.cancelEditButton = page.locator('[data-testid="new-team-cancel-edit"]')
    this.errorMessage = page.locator('[data-testid="new-team-error"]')
    this.successMessage = page.locator('[data-testid="new-team-success"]')

    this.loadingSpinner = page.locator('.table-wrap .spinner')
    this.rows = page.locator('[data-testid="team-row"]')
    this.prevPageButton = page.locator('[data-testid="team-prev-page"]')
    this.nextPageButton = page.locator('[data-testid="team-next-page"]')
    this.pageIndicator = page.locator('[data-testid="team-page-indicator"]')
  }

  async waitUntilTableLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  async addTeam(name: string) {
    await this.nameInput.fill(name)
    await this.submitButton.click()
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name })
  }

  /** Clicks "Next" until a row with this name is visible, or throws (teams are ordered by Id, not insertion order). */
  async findRowByName(name: string, maxPages = 20): Promise<Locator> {
    for (let i = 0; i < maxPages; i++) {
      await this.waitUntilTableLoaded()
      const row = this.rowByName(name)
      if ((await row.count()) > 0) return row

      if (await this.nextPageButton.isDisabled()) break
      await this.nextPageButton.click()
    }
    throw new Error(`Team "${name}" not found within ${maxPages} page(s)`)
  }

  async editTeam(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="team-edit-btn"]').click()
  }

  async deleteTeam(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="team-delete-btn"]').click()
    await row.locator('[data-testid="team-confirm-delete"]').click()
  }
}
