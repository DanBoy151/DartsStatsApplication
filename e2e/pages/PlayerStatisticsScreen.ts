import type { Locator, Page } from '@playwright/test'

const SECTION_KEYS = ['overall', 'singles', 'doubles', 'trebles'] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

/** POM for Statistics/PlayerStatistics.vue - one player's Overall/Singles/Doubles/Trebles stats plus their recent-form indicator. */
export class PlayerStatisticsScreen {
  readonly heading: Locator
  readonly playerSelect: Locator
  readonly doneButton: Locator
  readonly formPanel: Locator
  readonly trendBadge: Locator

  constructor(private readonly page: Page) {
    this.heading = page.locator('.form-heading')
    this.playerSelect = page.locator('[data-testid="player-statistics-player-select"]')
    this.doneButton = page.locator('[data-testid="player-statistics-done"]')
    this.formPanel = page.locator('[data-testid="player-statistics-form-panel"]')
    this.trendBadge = page.locator('[data-testid="player-statistics-trend"]')
  }

  async selectPlayer(name: string) {
    await this.playerSelect.selectOption({ label: name })
  }

  section(key: SectionKey): Locator {
    return this.page.locator(`[data-testid="player-statistics-section-${key}"]`)
  }

  seasonFilter(key: SectionKey): Locator {
    return this.page.locator(`[data-testid="player-statistics-season-${key}"]`)
  }

  /** Reads a stat tile's value within a section by its label (e.g. "Legs", "3DA", "W-L"). */
  async statValue(key: SectionKey, label: string): Promise<string> {
    const tile = this.section(key).locator('.stat-tile', { hasText: label })
    return (await tile.locator('.stat-value').textContent())?.trim() ?? ''
  }

  /**
   * Waits for the matching <option> to actually be in the DOM before
   * selecting it - the season list populates asynchronously once a player
   * is picked, and selectOption() only auto-waits on the <select> itself.
   */
  async filterSectionBySeason(key: SectionKey, seasonLabel: string) {
    const select = this.seasonFilter(key)
    await select.locator('option', { hasText: seasonLabel }).waitFor({ state: 'attached' })
    await select.selectOption({ label: seasonLabel })
  }
}
