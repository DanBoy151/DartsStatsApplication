import type { Locator, Page } from '@playwright/test'

export interface NewLeagueFormValues {
  name?: string
  numTrebles?: number
  numDoubles?: number
  numSingles?: number
  treblesLegs?: number
  doublesLegs?: number
  singlesLegs?: number
  treblesStartScore?: number
  doublesStartScore?: number
  singlesStartScore?: number
  /** Empty string clears the field (no limit). */
  maxRounds?: number | ''
}

/** POM for components/Manage/NewLeagueForm.vue - the league management table + add/edit form. */
export class NewLeagueScreen {
  readonly nameInput: Locator
  readonly numTreblesInput: Locator
  readonly numDoublesInput: Locator
  readonly numSinglesInput: Locator
  readonly treblesLegsInput: Locator
  readonly doublesLegsInput: Locator
  readonly singlesLegsInput: Locator
  readonly treblesStartScoreInput: Locator
  readonly doublesStartScoreInput: Locator
  readonly singlesStartScoreInput: Locator
  readonly maxRoundsInput: Locator

  readonly submitButton: Locator
  readonly doneButton: Locator
  readonly cancelEditButton: Locator
  readonly successMessage: Locator
  readonly nameError: Locator
  readonly gameCountsError: Locator
  readonly legCountsError: Locator
  readonly startScoresError: Locator
  readonly maxRoundsError: Locator

  readonly loadingSpinner: Locator
  readonly rows: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator
  readonly pageIndicator: Locator

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('[data-testid="new-league-name-input"]')
    this.numTreblesInput = page.locator('[data-testid="new-league-num-trebles-input"]')
    this.numDoublesInput = page.locator('[data-testid="new-league-num-doubles-input"]')
    this.numSinglesInput = page.locator('[data-testid="new-league-num-singles-input"]')
    this.treblesLegsInput = page.locator('[data-testid="new-league-trebles-legs-input"]')
    this.doublesLegsInput = page.locator('[data-testid="new-league-doubles-legs-input"]')
    this.singlesLegsInput = page.locator('[data-testid="new-league-singles-legs-input"]')
    this.treblesStartScoreInput = page.locator('[data-testid="new-league-trebles-start-score-input"]')
    this.doublesStartScoreInput = page.locator('[data-testid="new-league-doubles-start-score-input"]')
    this.singlesStartScoreInput = page.locator('[data-testid="new-league-singles-start-score-input"]')
    this.maxRoundsInput = page.locator('[data-testid="new-league-max-rounds-input"]')

    this.submitButton = page.locator('[data-testid="new-league-submit"]')
    this.doneButton = page.locator('[data-testid="new-league-done"]')
    this.cancelEditButton = page.locator('[data-testid="new-league-cancel-edit"]')
    this.successMessage = page.locator('[data-testid="new-league-success"]')
    this.nameError = page.locator('[data-testid="new-league-name-error"]')
    this.gameCountsError = page.locator('[data-testid="new-league-game-counts-error"]')
    this.legCountsError = page.locator('[data-testid="new-league-leg-counts-error"]')
    this.startScoresError = page.locator('[data-testid="new-league-start-scores-error"]')
    this.maxRoundsError = page.locator('[data-testid="new-league-max-rounds-error"]')

    this.loadingSpinner = page.locator('.table-wrap .spinner')
    this.rows = page.locator('[data-testid="league-row"]')
    this.prevPageButton = page.locator('[data-testid="league-prev-page"]')
    this.nextPageButton = page.locator('[data-testid="league-next-page"]')
    this.pageIndicator = page.locator('[data-testid="league-page-indicator"]')
  }

  async fill(values: NewLeagueFormValues) {
    if (values.name !== undefined) await this.nameInput.fill(values.name)
    if (values.numTrebles !== undefined) await this.numTreblesInput.fill(String(values.numTrebles))
    if (values.numDoubles !== undefined) await this.numDoublesInput.fill(String(values.numDoubles))
    if (values.numSingles !== undefined) await this.numSinglesInput.fill(String(values.numSingles))
    if (values.treblesLegs !== undefined) await this.treblesLegsInput.fill(String(values.treblesLegs))
    if (values.doublesLegs !== undefined) await this.doublesLegsInput.fill(String(values.doublesLegs))
    if (values.singlesLegs !== undefined) await this.singlesLegsInput.fill(String(values.singlesLegs))
    if (values.treblesStartScore !== undefined) await this.treblesStartScoreInput.fill(String(values.treblesStartScore))
    if (values.doublesStartScore !== undefined) await this.doublesStartScoreInput.fill(String(values.doublesStartScore))
    if (values.singlesStartScore !== undefined) await this.singlesStartScoreInput.fill(String(values.singlesStartScore))
    if (values.maxRounds !== undefined) await this.maxRoundsInput.fill(String(values.maxRounds))
  }

  async submit() {
    await this.submitButton.click()
  }

  async waitUntilTableLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name })
  }

  /** Clicks "Next" until a row with this name is visible, or throws (leagues are ordered by Id, not insertion order). */
  async findRowByName(name: string, maxPages = 20): Promise<Locator> {
    for (let i = 0; i < maxPages; i++) {
      await this.waitUntilTableLoaded()
      const row = this.rowByName(name)
      if ((await row.count()) > 0) return row

      if (await this.nextPageButton.isDisabled()) break
      await this.nextPageButton.click()
    }
    throw new Error(`League "${name}" not found within ${maxPages} page(s)`)
  }

  async editLeague(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="league-edit-btn"]').click()
  }

  async deleteLeague(name: string) {
    const row = await this.findRowByName(name)
    await row.locator('[data-testid="league-delete-btn"]').click()
    await row.locator('[data-testid="league-confirm-delete"]').click()
  }
}
