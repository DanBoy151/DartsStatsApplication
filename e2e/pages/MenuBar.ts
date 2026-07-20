import type { Locator, Page } from '@playwright/test'

/** POM for MenuBar.vue's "Manage" and "Statistics" dropdowns. */
export class MenuBar {
  readonly manageMenuItem: Locator
  readonly newPlayerOption: Locator
  readonly newMatchOption: Locator
  readonly statisticsMenuItem: Locator
  readonly teamStatisticsOption: Locator

  constructor(private readonly page: Page) {
    this.manageMenuItem = page.locator('.menu-item', { hasText: 'Manage' })
    this.newPlayerOption = page.locator('[data-testid="menu-new-player"]')
    this.newMatchOption = page.locator('[data-testid="menu-new-match"]')
    this.statisticsMenuItem = page.locator('.menu-item', { hasText: 'Statistics' })
    this.teamStatisticsOption = page.locator('[data-testid="menu-statistics"]')
  }

  async openNewPlayerForm() {
    await this.manageMenuItem.hover()
    await this.newPlayerOption.click()
  }

  async openNewMatchForm() {
    await this.manageMenuItem.hover()
    await this.newMatchOption.click()
  }

  async openTeamStatistics() {
    await this.statisticsMenuItem.hover()
    await this.teamStatisticsOption.click()
  }
}
