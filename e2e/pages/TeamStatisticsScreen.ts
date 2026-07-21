import type { Locator, Page } from '@playwright/test'

/** POM for Statistics/TeamStatistics.vue - the team-wide player stats leaderboard. */
export class TeamStatisticsScreen {
  readonly heading: Locator
  readonly rows: Locator
  readonly doneButton: Locator
  readonly teamFilter: Locator
  readonly seasonFilter: Locator

  constructor(private readonly page: Page) {
    this.heading = page.locator('.form-heading')
    this.rows = page.locator('[data-testid="stats-row"]')
    this.doneButton = page.locator('[data-testid="team-statistics-done"]')
    this.teamFilter = page.locator('[data-testid="team-statistics-team-filter"]')
    this.seasonFilter = page.locator('[data-testid="team-statistics-season-filter"]')
  }

  row(index: number): Locator {
    return this.rows.nth(index)
  }

  /** Clicks a player's name, which navigates to their Player Statistics page. */
  async clickPlayerName(name: string) {
    await this.rows.filter({ hasText: name }).locator('[data-testid="stats-player-link"]').click()
  }

  async filterByTeam(teamName: string) {
    await this.teamFilter.selectOption({ label: teamName })
  }

  /**
   * Waits for the matching <option> to actually be in the DOM before
   * selecting it - the season list populates asynchronously (getTeamSeasons)
   * once a team is picked, and selectOption() only auto-waits on the <select>
   * itself, not on a specific option appearing inside it.
   */
  async filterBySeason(seasonLabel: string) {
    // <option> elements inside a <select> are reported "hidden" by
    // Playwright's visibility algorithm even once rendered/selectable - wait
    // for it to be attached to the DOM instead.
    await this.seasonFilter.locator('option', { hasText: seasonLabel }).waitFor({ state: 'attached' })
    await this.seasonFilter.selectOption({ label: seasonLabel })
  }
}
