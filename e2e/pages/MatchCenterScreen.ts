import type { Locator, Page } from '@playwright/test'

/**
 * POM for MatchControl/MatchCenter.vue and its children (RemainingScorePanel,
 * EnterScorePanel, WonBullControl, DoublesFinishControl) - the live-scoring
 * screen for a single game.
 */
export class MatchCenterScreen {
  readonly root: Locator
  readonly startButton: Locator
  readonly finishButton: Locator
  readonly backButton: Locator
  readonly remainingScoreText: Locator

  readonly wonBullDialog: Locator
  readonly wonBullYesButton: Locator
  readonly wonBullNoButton: Locator

  readonly nextPlayerHeading: Locator
  readonly scoreInput: Locator
  readonly submitScoreButton: Locator
  readonly noScoreButton: Locator
  readonly scoreErrorMessage: Locator

  readonly doublesFinishDialog: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.match-center')
    this.startButton = this.root.getByRole('button', { name: 'Start' })
    this.finishButton = this.root.getByRole('button', { name: 'Finish' })
    this.backButton = this.root.getByRole('button', { name: 'Back' })
    this.remainingScoreText = this.root.locator('.remaining-score-row')

    this.wonBullDialog = page.locator('.won-bull-dialog')
    this.wonBullYesButton = this.wonBullDialog.getByRole('button', { name: 'Yes' })
    this.wonBullNoButton = this.wonBullDialog.getByRole('button', { name: 'No' })

    this.nextPlayerHeading = this.root.locator('.enter-score-panel h2')
    this.scoreInput = this.root.locator('.score-input')
    this.submitScoreButton = this.root.getByRole('button', { name: 'Submit' })
    this.noScoreButton = this.root.getByRole('button', { name: 'No Score' })
    this.scoreErrorMessage = this.root.locator('.enter-score-panel .error-message')

    this.doublesFinishDialog = page.locator('.doubles-finish-dialog')
  }

  async startGame() {
    await this.startButton.click()
    await this.wonBullDialog.waitFor({ state: 'visible' })
    await this.wonBullYesButton.click()

    // KNOWN ISSUE (see BUGS.md): the score panel's `disabled` styling clears
    // as soon as `started` flips true, which MatchCenter.onStartMatch() does
    // synchronously before its async chain (startGame -> fetchLegs ->
    // setSelectedLeg -> startLeg) finishes populating selectedLeg/
    // currentPlayer. A throw entered in that window is silently dropped
    // (submit() no-ops when either is unset). Not fixed here - it needs
    // onStartMatch() to gate readiness on more than `started`, which is a
    // real behavioural change beyond this bug's scope - so this just waits
    // it out, the same workaround manual verification needed.
    await this.page.waitForTimeout(1000)
  }

  /** Submits one throw. A checkout (remaining score reaches exactly 0) needs a follow-up finishLeg() call. */
  async enterScore(score: number) {
    await this.scoreInput.fill(String(score))
    await this.submitScoreButton.click()
  }

  /** Answers the "how many darts to finish?" popup that appears once a throw checks a leg out. */
  async finishLeg(darts: 1 | 2 | 3) {
    await this.doublesFinishDialog.waitFor({ state: 'visible' })
    await this.doublesFinishDialog.getByRole('button', { name: String(darts), exact: true }).click()
  }
}
