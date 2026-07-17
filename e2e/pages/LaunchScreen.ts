import type { Locator, Page } from '@playwright/test'

/**
 * POM for LaunchCaptainControl.vue - the screen shown on app launch, before a
 * match has been started. None of these elements carry data-testid hooks, so
 * selectors fall back to the component's CSS classes (see BUGS.md - lack of
 * test hooks is itself a documented finding).
 */
export class LaunchScreen {
  readonly playMatchButton: Locator
  readonly viewStatisticsButton: Locator
  readonly nextMatchLabel: Locator
  readonly loadingSpinner: Locator

  constructor(private readonly page: Page) {
    this.playMatchButton = page.locator('button.play-match-btn')
    this.viewStatisticsButton = page.locator('button.large-square-btn').filter({ hasText: 'View Statistics' })
    this.nextMatchLabel = page.locator('.next-match')
    this.loadingSpinner = page.locator('.loading-indicator .spinner')
  }

  async goto() {
    await this.page.goto('/')
  }

  /** Waits out the initial GET /api/Match/next call before interacting with the screen. */
  async waitUntilLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  async clickPlayMatch() {
    await this.playMatchButton.click()
  }
}
