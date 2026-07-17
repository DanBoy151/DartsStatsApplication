import type { Locator, Page } from '@playwright/test'

export interface NewMatchFormValues {
  opponent?: string
  date?: string
  location?: 'Home' | 'Away'
}

/** POM for components/Manage/NewMatchForm.vue. */
export class NewMatchScreen {
  readonly opponentInput: Locator
  readonly dateInput: Locator
  readonly locationSelect: Locator
  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly successMessage: Locator
  readonly opponentError: Locator
  readonly dateError: Locator
  readonly locationError: Locator

  constructor(private readonly page: Page) {
    this.opponentInput = page.locator('[data-testid="new-match-opponent-input"]')
    this.dateInput = page.locator('[data-testid="new-match-date-input"]')
    this.locationSelect = page.locator('[data-testid="new-match-location-input"]')
    this.submitButton = page.locator('[data-testid="new-match-submit"]')
    this.doneButton = page.locator('[data-testid="new-match-done"]')
    this.successMessage = page.locator('[data-testid="new-match-success"]')
    this.opponentError = page.locator('[data-testid="new-match-opponent-error"]')
    this.dateError = page.locator('[data-testid="new-match-date-error"]')
    this.locationError = page.locator('[data-testid="new-match-location-error"]')
  }

  async fill({ opponent, date, location }: NewMatchFormValues) {
    if (opponent !== undefined) await this.opponentInput.fill(opponent)
    if (date !== undefined) await this.dateInput.fill(date)
    if (location !== undefined) await this.locationSelect.selectOption(location)
  }

  async submit() {
    await this.submitButton.click()
  }
}
