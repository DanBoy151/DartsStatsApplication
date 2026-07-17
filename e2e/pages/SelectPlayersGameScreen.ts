import type { Locator, Page } from '@playwright/test'

/** POM for MatchControl/SelectPlayersGameControl.vue - assign players to a specific game once one is picked from the holding screen. */
export class SelectPlayersGameScreen {
  readonly root: Locator
  readonly heading: Locator
  readonly playerDropdowns: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.select-players-game-control')
    this.heading = this.root.locator('.player-list-heading')
    this.playerDropdowns = this.root.locator('.player-dropdown')
    this.saveButton = this.root.getByRole('button', { name: 'Save' })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
  }

  /** Picks a player by name in the dropdown at the given position (0-based). */
  async selectPlayer(dropdownIndex: number, playerName: string) {
    await this.playerDropdowns.nth(dropdownIndex).selectOption({ label: playerName })
  }
}
