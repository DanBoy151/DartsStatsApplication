import type { Locator, Page } from '@playwright/test'

// Below this width MenuBar.vue hides the desktop hover menu entirely
// (display:none) and shows the hamburger-triggered mobile drawer instead -
// must match the `@media (max-width: 899px)` breakpoint in MenuBar.vue.
const MOBILE_BREAKPOINT = 900

/** POM for MenuBar.vue's "Manage" and "Statistics" dropdowns. */
export class MenuBar {
  readonly homeLink: Locator
  readonly manageMenuItem: Locator
  readonly newPlayerOption: Locator
  readonly newMatchOption: Locator
  readonly newLeagueOption: Locator
  readonly newTeamOption: Locator
  readonly newSeasonOption: Locator
  readonly statisticsMenuItem: Locator
  readonly teamStatisticsOption: Locator
  readonly playerStatisticsOption: Locator
  readonly mobileMenuToggle: Locator
  readonly mobileStatisticsSection: Locator
  readonly mobilePlayerStatisticsOption: Locator

  constructor(private readonly page: Page) {
    this.homeLink = page.locator('[data-testid="menu-main"]')
    this.manageMenuItem = page.locator('.menu-item', { hasText: 'Manage' })
    this.newPlayerOption = page.locator('[data-testid="menu-new-player"]')
    this.newMatchOption = page.locator('[data-testid="menu-new-match"]')
    this.newLeagueOption = page.locator('[data-testid="menu-new-league"]')
    this.newTeamOption = page.locator('[data-testid="menu-new-team"]')
    this.newSeasonOption = page.locator('[data-testid="menu-new-season"]')
    this.statisticsMenuItem = page.locator('.menu-item', { hasText: 'Statistics' })
    this.teamStatisticsOption = page.locator('[data-testid="menu-statistics"]')
    this.playerStatisticsOption = page.locator('[data-testid="menu-player-statistics"]')
    this.mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]')
    this.mobileStatisticsSection = page.locator('[data-testid="mobile-menu-section-statistics"]')
    this.mobilePlayerStatisticsOption = page.locator('[data-testid="mobile-menu-player-statistics"]')
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
    const viewportWidth = this.page.viewportSize()?.width ?? 0
    if (viewportWidth < MOBILE_BREAKPOINT) {
      await this.mobileMenuToggle.click()
      await this.mobileStatisticsSection.click()
      await this.mobilePlayerStatisticsOption.click()
      return
    }
    await this.statisticsMenuItem.hover()
    await this.playerStatisticsOption.click()
  }
}
