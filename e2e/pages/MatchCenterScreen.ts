import type { Locator, Page } from '@playwright/test'

/**
 * POM for MatchControl/MatchCenter.vue and its children (ScoringConsole,
 * ScoreLedgerPanel, StatsPanel, GameListDrawer, WonBullControl,
 * DoublesFinishControl) - the live-scoring screen for a single game.
 */
export class MatchCenterScreen {
  readonly root: Locator
  readonly startButton: Locator
  readonly finishButton: Locator
  readonly backButton: Locator
  /** Only visible while a game is Ready (not yet started) - Back only shows once started or read-only. */
  readonly cancelButton: Locator
  readonly editPlayersButton: Locator

  readonly wonBullDialog: Locator
  readonly wonBullQuestion: Locator
  readonly wonBullYesButton: Locator
  readonly wonBullNoButton: Locator
  readonly bullResultChip: Locator

  readonly nextPlayerHeading: Locator
  /** The hero remaining-score number itself - there's no separate "N remaining" chip any more (see ScoringConsole.vue), so assertions compare against the bare number, not "N remaining" text. */
  readonly turnRemaining: Locator
  readonly keypad: Locator
  readonly submitScoreButton: Locator
  readonly noScoreButton: Locator
  readonly scoreErrorMessage: Locator

  readonly doublesFinishDialog: Locator
  readonly ledgerEditableScores: Locator
  readonly ledgerEditError: Locator

  /** Only rendered once a game has more than one leg - see ScoreLedgerPanel.vue. */
  readonly legTabs: Locator
  readonly viewingHistoryNote: Locator
  readonly legFinalSummary: Locator

  /** Collapsible secondary cards (see ScoreLedgerPanel.vue/StatsPanel.vue's own <details> wrapper), siblings of ScoringConsole below it - not tab-switched panels any more. */
  readonly scoreLedgerCard: Locator
  readonly statsCard: Locator

  /** On-demand game switcher, replacing the old permanent left rail while a game is active (see ScoringConsole.vue/GameListDrawer.vue). */
  readonly gamesDrawerTrigger: Locator
  readonly gamesDrawer: Locator
  readonly gamesDrawerClose: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('.match-center')
    this.startButton = this.root.getByRole('button', { name: 'Start' })
    this.finishButton = this.root.getByRole('button', { name: 'Finish' })
    this.backButton = this.root.getByRole('button', { name: 'Back' })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
    this.editPlayersButton = this.root.getByRole('button', { name: 'Edit Players' })

    this.wonBullDialog = page.locator('.won-bull-dialog')
    this.wonBullQuestion = this.wonBullDialog.locator('.won-bull-question')
    this.wonBullYesButton = this.wonBullDialog.getByRole('button', { name: 'Yes' })
    this.wonBullNoButton = this.wonBullDialog.getByRole('button', { name: 'No' })
    this.bullResultChip = this.root.locator('[data-testid="bull-result-chip"]')

    this.nextPlayerHeading = this.root.locator('.turn-heading')
    this.turnRemaining = this.root.locator('.hero-score')
    this.keypad = this.root.locator('.keypad-grid')
    this.submitScoreButton = this.root.getByRole('button', { name: 'Submit' })
    this.noScoreButton = this.root.getByRole('button', { name: 'No Score' })
    this.scoreErrorMessage = this.root.locator('.error-message')

    this.doublesFinishDialog = page.locator('.doubles-finish-dialog')
    this.ledgerEditableScores = this.root.locator('.ledger-score-editable')
    this.ledgerEditError = this.root.locator('.ledger-edit-error')

    this.legTabs = this.root.locator('[data-testid^="leg-tab-"]')
    this.viewingHistoryNote = this.root.locator('[data-testid="viewing-history-note"]')
    this.legFinalSummary = this.root.locator('[data-testid="leg-final-summary"]')

    this.scoreLedgerCard = this.root.locator('.score-ledger-panel')
    this.statsCard = this.root.locator('.stats-panel')

    this.gamesDrawerTrigger = this.root.locator('[data-testid="open-games-drawer"]')
    this.gamesDrawer = page.locator('[aria-label="Games in this match"]')
    this.gamesDrawerClose = page.locator('[data-testid="close-games-drawer"]')
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

  /** Submits one throw via the number keypad. A checkout (remaining score reaches exactly 0) needs a follow-up finishLeg() call. */
  async enterScore(score: number) {
    for (const digit of String(score)) {
      await this.keypad.locator(`button[data-key="${digit}"]`).click()
    }
    await this.submitScoreButton.click()
  }

  /** Answers the "how many darts to finish?" popup that appears once a throw checks a leg out (a Win). */
  async finishLeg(darts: 1 | 2 | 3) {
    await this.doublesFinishDialog.waitFor({ state: 'visible' })
    await this.doublesFinishDialog.getByRole('button', { name: String(darts), exact: true }).click()
  }

  /**
   * Clicks Finish directly. At remaining=0 this behaves like finishLeg() (a
   * checkout Win, via the same darts-count popup); at any other remaining
   * score it completes the leg immediately as a Loss, no popup.
   */
  async clickFinish() {
    await this.finishButton.click()
  }

  /** True once a game is fully played out: no Start/Finish, just Back to leave the read-only view. */
  async isReadonly(): Promise<boolean> {
    const [start, finish, back] = await Promise.all([
      this.startButton.isVisible(),
      this.finishButton.isVisible(),
      this.backButton.isVisible(),
    ])
    return !start && !finish && back
  }

  /** Corrects a previously-recorded throw at `index` (0-based, ledger order) in the Score Ledger, only available while a game is In Progress. */
  async editLedgerScore(index: number, newValue: number) {
    await this.root.locator(`[data-testid="ledger-score-${index}"]`).click()
    await this.root.locator(`[data-testid="ledger-edit-input-${index}"]`).fill(String(newValue))
    await this.root.locator(`[data-testid="ledger-edit-save-${index}"]`).click()
  }

  /** Corrects an already-recorded bull result via the header chip, reusing the same Yes/No dialog Start uses. */
  async editBullResult(won: boolean) {
    await this.bullResultChip.click()
    await this.wonBullDialog.waitFor({ state: 'visible' })
    await (won ? this.wonBullYesButton : this.wonBullNoButton).click()
    await this.wonBullDialog.waitFor({ state: 'hidden' })
  }

  /** The leg tab at `index` (0-based) in the Score Ledger's leg history row. */
  legTab(index: number): Locator {
    return this.root.locator(`[data-testid="leg-tab-${index}"]`)
  }

  async openGamesDrawer() {
    await this.gamesDrawerTrigger.click()
    await this.gamesDrawer.waitFor({ state: 'visible' })
  }
}
