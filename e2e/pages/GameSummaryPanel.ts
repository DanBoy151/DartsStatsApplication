import type { Locator, Page } from '@playwright/test'

/** POM for MatchControl/GameSummaryPanel.vue - lists the match's games. In
 *  its 'full' variant (the merged pre-game overview screen) it also carries
 *  the "Select Game" heading and "Back to Players" button that used to live
 *  in the now-deleted standalone HoldingScreenControl.vue. */
export class GameSummaryPanel {
  readonly root: Locator
  readonly heading: Locator
  readonly backButton: Locator
  readonly opposition: Locator
  readonly date: Locator
  readonly currentScore: Locator
  readonly gameBoxes: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.game-summary-panel')
    this.heading = this.root.locator('.header-title')
    this.backButton = this.root.getByRole('button', { name: 'Back to Players' })
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

  private static testIdFor(type: 'Trebles' | 'Doubles' | 'Singles'): string {
    switch (type) {
      case 'Trebles': return 'game-box-treble'
      case 'Doubles': return 'game-box-double'
      case 'Singles': return 'game-box-single'
    }
  }

  /** Games are listed in a fixed order (2 Trebles, 3 Doubles, 6 Singles - see MatchService.CreatePendingGames), not by type. */
  gameBoxesByType(type: 'Trebles' | 'Doubles' | 'Singles'): Locator {
    return this.root.locator(`[data-testid="${GameSummaryPanel.testIdFor(type)}"]`)
  }

  gameBoxByType(type: 'Trebles' | 'Doubles' | 'Singles', index = 0): Locator {
    return this.gameBoxesByType(type).nth(index)
  }

  async selectGame(index: number) {
    await this.gameBoxByIndex(index).click()
  }
}
