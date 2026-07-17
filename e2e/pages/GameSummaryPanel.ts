import type { Locator, Page } from '@playwright/test'

/** POM for MatchControl/GameSummaryPanel.vue - the persistent left-hand panel listing the match's games. */
export class GameSummaryPanel {
  readonly root: Locator
  readonly opposition: Locator
  readonly date: Locator
  readonly currentScore: Locator
  readonly gameBoxes: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.game-summary-panel')
    this.opposition = this.root.locator('.summary-row', { hasText: 'Opposition:' }).locator('.summary-value')
    this.date = this.root.locator('.summary-row', { hasText: 'Date:' }).locator('.summary-value')
    this.currentScore = this.root.locator('.summary-row', { hasText: 'Current Score:' }).locator('.summary-value')
    this.gameBoxes = this.root.locator('.game-box')
  }

  async gameCount(): Promise<number> {
    return this.gameBoxes.count()
  }

  gameBoxByIndex(index: number): Locator {
    return this.gameBoxes.nth(index)
  }

  /** Games are listed in a fixed order (2 Trebles, 3 Doubles, 6 Singles - see MatchService.CreatePendingGames), not by type. */
  gameBoxesByType(type: 'Trebles' | 'Doubles' | 'Singles'): Locator {
    return this.gameBoxes.filter({ hasText: type })
  }

  gameBoxByType(type: 'Trebles' | 'Doubles' | 'Singles', index = 0): Locator {
    return this.gameBoxesByType(type).nth(index)
  }

  async selectGame(index: number) {
    await this.gameBoxByIndex(index).click()
  }
}
