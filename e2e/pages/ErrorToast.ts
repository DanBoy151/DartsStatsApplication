import type { Locator, Page } from '@playwright/test'

/** Component POM for ErrorToast.vue - the global error banner fed by matchDataStore.lastError. */
export class ErrorToast {
  readonly root: Locator
  readonly message: Locator
  readonly dismissButton: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.error-toast')
    this.message = this.root.locator('.error-toast-message')
    this.dismissButton = this.root.getByRole('button', { name: 'Dismiss' })
  }

  async dismiss() {
    await this.dismissButton.click()
  }
}
