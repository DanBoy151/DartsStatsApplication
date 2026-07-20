import type { Locator, Page } from '@playwright/test'

/** POM for Statistics/TeamStatistics.vue - the team-wide player stats leaderboard. */
export class TeamStatisticsScreen {
  readonly heading: Locator
  readonly rows: Locator
  readonly doneButton: Locator

  constructor(private readonly page: Page) {
    this.heading = page.locator('.form-heading')
    this.rows = page.locator('[data-testid="stats-row"]')
    this.doneButton = page.locator('[data-testid="team-statistics-done"]')
  }

  row(index: number): Locator {
    return this.rows.nth(index)
  }
}
