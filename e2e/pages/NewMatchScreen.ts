import type { Locator, Page } from '@playwright/test'

export interface NewMatchFormValues {
  opponent?: string
  date?: string
  location?: 'Home' | 'Away'
}

/** POM for components/Manage/NewMatchForm.vue - the match management table + add/edit form. */
export class NewMatchScreen {
  readonly opponentInput: Locator
  readonly dateInput: Locator
  readonly locationSelect: Locator
  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly cancelEditButton: Locator
  readonly successMessage: Locator
  readonly opponentError: Locator
  readonly dateError: Locator
  readonly locationError: Locator

  readonly loadingSpinner: Locator
  readonly rows: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator
  readonly pageIndicator: Locator

  constructor(private readonly page: Page) {
    this.opponentInput = page.locator('[data-testid="new-match-opponent-input"]')
    this.dateInput = page.locator('[data-testid="new-match-date-input"]')
    this.locationSelect = page.locator('[data-testid="new-match-location-input"]')
    this.submitButton = page.locator('[data-testid="new-match-submit"]')
    this.doneButton = page.locator('[data-testid="new-match-done"]')
    this.cancelEditButton = page.locator('[data-testid="new-match-cancel-edit"]')
    this.successMessage = page.locator('[data-testid="new-match-success"]')
    this.opponentError = page.locator('[data-testid="new-match-opponent-error"]')
    this.dateError = page.locator('[data-testid="new-match-date-error"]')
    this.locationError = page.locator('[data-testid="new-match-location-error"]')

    this.loadingSpinner = page.locator('.table-wrap .spinner')
    this.rows = page.locator('[data-testid="match-row"]')
    this.prevPageButton = page.locator('[data-testid="match-prev-page"]')
    this.nextPageButton = page.locator('[data-testid="match-next-page"]')
    this.pageIndicator = page.locator('[data-testid="match-page-indicator"]')
  }

  async fill({ opponent, date, location }: NewMatchFormValues) {
    if (opponent !== undefined) await this.opponentInput.fill(opponent)
    if (date !== undefined) await this.dateInput.fill(date)
    if (location !== undefined) await this.locationSelect.selectOption(location)
  }

  async submit() {
    await this.submitButton.click()
  }

  async waitUntilTableLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  rowByOpponent(opponent: string): Locator {
    return this.rows.filter({ hasText: opponent })
  }

  /**
   * Clicks "Next" until a row for this opponent is visible, or throws. Matches are
   * ordered by Id (not insertion order), so a freshly created record can land on
   * any page - this makes finding it in the table order-independent.
   */
  async findRowByOpponent(opponent: string, maxPages = 20): Promise<Locator> {
    for (let i = 0; i < maxPages; i++) {
      await this.waitUntilTableLoaded()
      const row = this.rowByOpponent(opponent)
      if ((await row.count()) > 0) return row

      if (await this.nextPageButton.isDisabled()) break
      await this.nextPageButton.click()
    }
    throw new Error(`Match vs "${opponent}" not found within ${maxPages} page(s)`)
  }

  async editMatch(opponent: string) {
    const row = await this.findRowByOpponent(opponent)
    await row.locator('[data-testid="match-edit-btn"]').click()
  }

  async deleteMatch(opponent: string) {
    const row = await this.findRowByOpponent(opponent)
    await row.locator('[data-testid="match-delete-btn"]').click()
    await row.locator('[data-testid="match-confirm-delete"]').click()
  }
}
