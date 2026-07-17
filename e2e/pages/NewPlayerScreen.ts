import type { Locator, Page } from '@playwright/test'

/** POM for components/Manage/NewPlayerForm.vue - the player management table + add/edit form. */
export class NewPlayerScreen {
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
    this.nameInput = page.locator('[data-testid="new-player-name-input"]')
    this.submitButton = page.locator('[data-testid="new-player-submit"]')
    this.doneButton = page.locator('[data-testid="new-player-done"]')
    this.cancelEditButton = page.locator('[data-testid="new-player-cancel-edit"]')
    this.errorMessage = page.locator('[data-testid="new-player-error"]')
    this.successMessage = page.locator('[data-testid="new-player-success"]')

    this.loadingSpinner = page.locator('.table-wrap .spinner')
    this.rows = page.locator('[data-testid="player-row"]')
    this.prevPageButton = page.locator('[data-testid="player-prev-page"]')
    this.nextPageButton = page.locator('[data-testid="player-next-page"]')
    this.pageIndicator = page.locator('[data-testid="player-page-indicator"]')
  }

  async waitUntilTableLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  async addPlayer(name: string) {
    await this.nameInput.fill(name)
    await this.submitButton.click()
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name })
  }

  /**
   * Clicks "Next" until a row with this name is visible, or throws. Players are
   * ordered by Id (not insertion order), so a freshly created record can land on
   * any page - this makes finding it in the table order-independent.
   */
  async findRowByName(name: string, maxPages = 20): Promise<Locator> {
    for (let i = 0; i < maxPages; i++) {
      await this.waitUntilTableLoaded()
      const row = this.rowByName(name)
      if ((await row.count()) > 0) return row

      if (await this.nextPageButton.isDisabled()) break
      await this.nextPageButton.click()
    }
    throw new Error(`Player "${name}" not found within ${maxPages} page(s)`)
  }

  async editPlayer(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="player-edit-btn"]').click()
  }

  async deletePlayer(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="player-delete-btn"]').click()
    await row.locator('[data-testid="player-confirm-delete"]').click()
  }
}
