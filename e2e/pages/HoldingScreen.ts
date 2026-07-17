import type { Locator, Page } from '@playwright/test'

/** POM for MatchControl/HoldingScreenControl.vue - shown after available players are confirmed, before a game is picked. */
export class HoldingScreen {
  readonly root: Locator
  readonly heading: Locator
  readonly backButton: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.holding-screen')
    this.heading = this.root.locator('.heading')
    // Labelled "Back" in the UI but wired to the 'exit' event - see BUGS.md.
    this.backButton = this.root.getByRole('button', { name: 'Back' })
  }
}
