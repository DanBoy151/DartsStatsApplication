import type { Locator, Page } from '@playwright/test'

/** POM for components/Manage/NewPlayerForm.vue. */
export class NewPlayerScreen {
  readonly nameInput: Locator
  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('[data-testid="new-player-name-input"]')
    this.submitButton = page.locator('[data-testid="new-player-submit"]')
    this.doneButton = page.locator('[data-testid="new-player-done"]')
    this.errorMessage = page.locator('[data-testid="new-player-error"]')
    this.successMessage = page.locator('[data-testid="new-player-success"]')
  }

  async addPlayer(name: string) {
    await this.nameInput.fill(name)
    await this.submitButton.click()
  }
}
