import type { Locator, Page } from '@playwright/test'

/** POM for MatchControl/AvailablePlayersControl.vue - select which players are available, then Proceed. */
export class AvailablePlayersScreen {
  readonly root: Locator
  readonly heading: Locator
  readonly loadingSpinner: Locator
  readonly playerItems: Locator
  readonly proceedButton: Locator
  readonly backButton: Locator
  readonly selectionCount: Locator
  readonly oppositionShortCheckbox: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.available-players-control')
    this.heading = this.root.locator('.player-list-heading')
    this.loadingSpinner = this.root.locator('.spinner')
    this.playerItems = this.root.locator('.player-item')
    this.proceedButton = this.root.getByRole('button', { name: 'Proceed' })
    this.backButton = this.root.getByRole('button', { name: 'Back' })
    this.selectionCount = this.root.locator('[data-testid="available-players-count"]')
    this.oppositionShortCheckbox = this.root.locator('[data-testid="opposition-short-checkbox"]')
  }

  async waitUntilLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  playerCheckbox(name: string): Locator {
    return this.root.locator('.player-item', { hasText: name }).getByRole('checkbox')
  }

  async setPlayerAvailable(name: string, available = true) {
    const checkbox = this.playerCheckbox(name)
    if ((await checkbox.isChecked()) !== available) {
      await checkbox.setChecked(available)
    }
  }

  async selectedPlayerCount(): Promise<number> {
    return this.root.locator('.player-item input:checked').count()
  }

  async setOppositionShortHanded(shortHanded = true) {
    if ((await this.oppositionShortCheckbox.isChecked()) !== shortHanded) {
      await this.oppositionShortCheckbox.setChecked(shortHanded)
    }
  }

  async proceed() {
    await this.proceedButton.click()
  }
}
