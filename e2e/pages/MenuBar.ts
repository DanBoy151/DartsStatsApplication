import type { Locator, Page } from '@playwright/test'

/** POM for MenuBar.vue's "Manage" and "Statistics" dropdowns. */
export class MenuBar {
  readonly manageMenuItem: Locator
  readonly newPlayerOption: Locator
  readonly newMatchOption: Locator
  readonly newLeagueOption: Locator
  readonly newTeamOption: Locator
  readonly newSeasonOption: Locator
  readonly statisticsMenuItem: Locator
  readonly teamStatisticsOption: Locator
  readonly playerStatisticsOption: Locator

  constructor(private readonly page: Page) {
    this.manageMenuItem = page.locator('.menu-item', { hasText: 'Manage' })
    this.newPlayerOption = page.locator('[data-testid="menu-new-player"]')
    this.newMatchOption = page.locator('[data-testid="menu-new-match"]')
    this.newLeagueOption = page.locator('[data-testid="menu-new-league"]')
    this.newTeamOption = page.locator('[data-testid="menu-new-team"]')
    this.newSeasonOption = page.locator('[data-testid="menu-new-season"]')
    this.statisticsMenuItem = page.locator('.menu-item', { hasText: 'Statistics' })
    this.teamStatisticsOption = page.locator('[data-testid="menu-statistics"]')
    this.playerStatisticsOption = page.locator('[data-testid="menu-player-statistics"]')
  }

  async openNewPlayerForm() {
    await this.manageMenuItem.hover()
    await this.newPlayerOption.click()
  }

  async openNewMatchForm() {
    await this.manageMenuItem.hover()
    await this.newMatchOption.click()
  }

  async openNewLeagueForm() {
    await this.manageMenuItem.hover()
    await this.newLeagueOption.click()
  }

  async openNewTeamForm() {
    await this.manageMenuItem.hover()
    await this.newTeamOption.click()
  }

  async openNewSeasonForm() {
    await this.manageMenuItem.hover()
    await this.newSeasonOption.click()
  }

  async openTeamStatistics() {
    await this.statisticsMenuItem.hover()
    await this.teamStatisticsOption.click()
  }

  async openPlayerStatistics() {
    await this.statisticsMenuItem.hover()
    await this.playerStatisticsOption.click()
  }
}
