import type { Locator, Page } from '@playwright/test'

/** POM for MenuBar.vue's "Manage" dropdown - the entry point for the New Player/New Match journeys. */
export class MenuBar {
  readonly manageMenuItem: Locator
  readonly newPlayerOption: Locator
  readonly newMatchOption: Locator

  constructor(private readonly page: Page) {
    this.manageMenuItem = page.locator('.menu-item', { hasText: 'Manage' })
    this.newPlayerOption = page.locator('[data-testid="menu-new-player"]')
    this.newMatchOption = page.locator('[data-testid="menu-new-match"]')
  }

  async openNewPlayerForm() {
    await this.manageMenuItem.hover()
    await this.newPlayerOption.click()
  }

  async openNewMatchForm() {
    await this.manageMenuItem.hover()
    await this.newMatchOption.click()
  }
}
