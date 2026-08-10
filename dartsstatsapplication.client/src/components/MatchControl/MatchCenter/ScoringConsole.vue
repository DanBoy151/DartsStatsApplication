<template>
  <div class="scoring-console" ref="consoleEl">
    <div class="console-header">
      <div class="turn">
        <span v-if="started && !readonly" class="turn-dot" :style="{ background: playerColor(currentPlayerIndex) }"></span>
        <div class="turn-text">
          <h2 class="turn-heading">{{ headingText }}</h2>
          <span class="turn-meta">{{ metaText }}</span>
        </div>
      </div>
      <div class="header-chips">
        <button v-if="wonBullKnown"
                type="button"
                class="bull-chip"
                :class="{ won: currentWonBull }"
                data-testid="bull-result-chip"
                @click="openBullEditor">
          Bull: {{ currentWonBull ? 'Won' : 'Lost' }} <span class="edit-icon" aria-hidden="true">✎</span>
        </button>
        <button v-if="gamesTotal" type="button" class="games-chip" data-testid="open-games-drawer" @click="emit('open-games')">
          Games {{ gameNumber }} / {{ gamesTotal }} <span class="chev">▸</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="hero-zone">
      <span v-if="started && !readonly" class="hero-round">Round {{ currentRoundNumber }}</span>
      <div class="hero-score">{{ score }}</div>
      <div class="hero-caption" :class="{ 'is-preview': previewRemaining !== null && !wouldBust, 'is-bust': wouldBust }">
        <template v-if="started && !readonly && previewRemaining !== null">{{ wouldBust ? 'Bust — score won\'t count' : `→ ${previewRemaining} remaining` }}</template>
      </div>
    </div>

    <template v-if="started && !readonly">
      <div class="keypad-display">
        <span class="keypad-value" :class="{ placeholder: !scoreValue }">{{ scoreValue || '0' }}</span>
      </div>

      <div class="keypad-grid">
        <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
                :key="d"
                type="button"
                class="key"
                :data-key="d"
                @click="pressDigit(d)">{{ d }}</button>
        <button type="button" class="key wide" data-key="clear" @click="clearValue">Clear</button>
        <button type="button" class="key" data-key="0" @click="pressDigit('0')">0</button>
        <button type="button" class="key wide" data-key="backspace" aria-label="Erase last digit" @click="backspace">⌫</button>
      </div>
    </template>

    <div class="action-row" ref="actionRowEl">
      <template v-if="readonly">
        <button class="btn btn-primary" type="button" @click="backMatch">Back</button>
      </template>
      <template v-else-if="!started">
        <button class="btn btn-primary" type="button" @click="showBullPopup = true">Start</button>
        <button class="btn btn-secondary" type="button" @click="editPlayers">Edit Players</button>
        <button class="btn btn-secondary" type="button" @click="cancelMatch">Cancel</button>
      </template>
      <template v-else>
        <button class="btn btn-neutral" type="button" @click="noScore">No Score</button>
        <button class="btn btn-primary" type="button" @click="submit">Submit</button>
      </template>
    </div>

    <div v-if="started && !readonly" class="quiet-row">
      <button class="btn-quiet" type="button" @click="finish">Finish leg without checking out</button>
      <button class="btn-quiet" type="button" @click="backMatch">Back</button>
    </div>

    <WonBullControl v-if="showBullPopup" :player-names="gamePlayerNames" @result="onBullResult" />
    <DoublesFinishControl v-if="showCheckoutDartsPopup" @result="onCheckoutDartsResult" />
    <OpponentCheckedOutControl v-if="showOpponentCheckedOutPopup" @result="onOpponentCheckedOutResult" />
    <BullOffControl v-if="showBullOffPopup" @result="onBullOffResult" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import WonBullControl from './WonBullControl.vue'
  import DoublesFinishControl from './DoublesFinishControl.vue'
  import OpponentCheckedOutControl from './OpponentCheckedOutControl.vue'
  import BullOffControl from './BullOffControl.vue'
  import { useMatchDataStore } from '@/stores/matchDataStore'
  import { currentRound, isBullOffRound } from '@/models/gameProgress'
  import { isValidDartScore, isValidCheckoutScore } from '@/models/dartScoring'
  import { playerColor } from '@/models/playerColors'
  import { saveLegProgressInBackground } from '@/actions/LegService'

  const matchDataStore = useMatchDataStore()

  const props = defineProps<{
    gameType: string
    gamestarted?: boolean
    /** Viewing a Complete game: show the last leg's result only, no scoring controls. */
    readonly?: boolean
    gameNumber?: number
    gamesTotal?: number
  }>()

  const emit = defineEmits<{
    (e: 'start-match', payload: { wonBull: boolean }): void
    (e: 'finish-leg'): void
    (e: 'back-match'): void
    (e: 'cancel-match'): void
    (e: 'edit-players'): void
    (e: 'legComplete'): void
    (e: 'open-games'): void
    (e: 'update-won-bull', wonBull: boolean): void
  }>()

  const remainingScore = computed(() => matchDataStore.getSelectedLeg()?.remainingScore ?? 0)

  const currentPlayerIndex = computed(() => {
    const game = matchDataStore.selectedGame
    const playerId = matchDataStore.currentPlayer
    if (!game || !playerId) return -1
    return game.players.findIndex((id) => id === playerId)
  })

  const currentPlayerName = computed(() => {
    const playerId = matchDataStore.currentPlayer
    if (!playerId) return ''
    const player = matchDataStore.matchAvailablePlayers.find((p) => p.playerId === playerId)
    return player ? player.name : ''
  })

  const headingText = computed(() => {
    if (props.readonly) return 'Leg result'
    if (!started.value) return 'Ready to start'
    return currentPlayerName.value ? `${currentPlayerName.value} to throw` : 'Next throw'
  })

  // Resolves this game's assigned player(s) to real name(s) for the bull-off
  // prompt ("Did Dave Chisnall / Gary Anderson win the Bull-Off?"), same
  // playerId -> name lookup pattern as currentPlayerName above and
  // GameSummaryPanel.vue's displayPlayers().
  const gamePlayerNames = computed(() => {
    const players = matchDataStore.selectedGame?.players ?? []
    if (players.length === 0) return ''
    return players
      .map((id) => matchDataStore.matchAvailablePlayers.find((p) => p.playerId === id)?.name ?? id)
      .join(' / ')
  })

  // The bull result only has a value once the game has actually been
  // started at some point - before that (Ready, not yet started) there's
  // nothing recorded yet to show or edit.
  const wonBullKnown = computed(() => started.value || !!props.readonly)
  const currentWonBull = computed(() => matchDataStore.getSelectedGame()?.wonBull ?? false)

  const metaText = computed(() => props.gameType ?? '')

  function hasMatchStarted() {
    const game = matchDataStore.getSelectedGame()
    return game?.status === 'InProgress'
  }

  const started = ref(!!props.gamestarted || hasMatchStarted())
  const showBullPopup = ref(false)
  const showCheckoutDartsPopup = ref(false)
  const showOpponentCheckedOutPopup = ref(false)
  const showBullOffPopup = ref(false)
  const wonBull = ref<boolean | null>(null)
  // True while showBullPopup is open to correct an already-recorded result
  // (via the header's Bull chip), rather than to decide it for the first
  // time before Start - distinguishes the two in onBullResult() below.
  const editingBullResult = ref(false)
  const score = ref<number | string>(getInitialScore())
  const actionRowEl = ref<HTMLDivElement | null>(null)

  watch(remainingScore, (newScore) => {
    score.value = newScore
  })

  // The console grows once a leg starts (the keypad appears above the
  // action row) - on a short/narrow viewport that can push Submit/No Score
  // below the fold with nothing to prompt scrolling down to them.
  // block:'end' brings the action row's own bottom edge to the bottom of
  // whatever's scrollable, prioritising the buttons actually needed to
  // throw over the turn header/hero above them - the reverse (block:'start'
  // on the console's top) left Submit still off-screen on a short window,
  // since the now-much-taller console no longer fits in one screen there.
  // nextTick alone (DOM patched) isn't quite enough - requestAnimationFrame
  // after it waits for the browser to have actually laid out that patched
  // DOM before scrollIntoView measures it, otherwise the scroll can be
  // computed against not-yet-settled geometry and undershoot.
  watch(started, (isStarted) => {
    if (!isStarted) return
    nextTick(() => {
      requestAnimationFrame(() => {
        actionRowEl.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    })
  })

  // Sync started with gamestarted prop
  watch(
    () => props.gamestarted,
    (val) => {
      started.value = !!val || hasMatchStarted()
    },
    { immediate: true }
  )

  function getInitialScore() {
    const defaultScore = 0

    if (hasMatchStarted() || props.readonly) {
      return remainingScore.value
    }
    // Prefer the game's actual configured starting score (from its League,
    // or the compat-guard default written server-side) - the hardcoded
    // table below only covers today's fixed defaults, and is a fallback
    // for the rare case a game object doesn't have the field yet.
    const configured = matchDataStore.selectedGame?.startingScore
    if (configured && configured > 0) return configured

    const type = props.gameType?.toLowerCase()
    if (type === 'trebles' || type === 'treble') return 701
    if (type === 'doubles' || type === 'double') return 601
    if (type === 'singles' || type === 'single') return 501
    return defaultScore
  }

  function onBullResult(result: boolean) {
    showBullPopup.value = false

    if (editingBullResult.value) {
      editingBullResult.value = false
      emit('update-won-bull', result)
      return
    }

    wonBull.value = result
    startMatch()
  }

  function openBullEditor() {
    editingBullResult.value = true
    showBullPopup.value = true
  }

  function startMatch() {
    started.value = true
    emit('start-match', { wonBull: wonBull.value ?? false })
  }

  function cancelMatch() {
    emit('cancel-match')
  }

  function backMatch() {
    emit('back-match')
  }

  function editPlayers() {
    emit('edit-players')
  }

  /**
   * Reaching exactly 0 is a genuine checkout - same as the automatic popup
   * triggered when a throw brings the score to 0 - so ask how many darts it
   * took and record a Win. Otherwise, the leg is being ended without
   * checking out, which can only mean a Loss - complete it immediately, no
   * darts count to ask for.
   */
  function finish() {
    if (remainingScore.value === 0) {
      showCheckoutDartsPopup.value = true
    } else {
      matchDataStore.completeSelectedLeg('Loss', 0)
      emit('finish-leg')
    }
  }

  // Shared by both the auto-popup submit() opens on a checkout throw and the
  // one finish() opens when remaining is already 0 - both just need a darts
  // count before recording the same Win.
  function onCheckoutDartsResult(darts: number) {
    showCheckoutDartsPopup.value = false
    matchDataStore.completeSelectedLeg('Win', darts)
    emit('legComplete')
  }

  /**
   * Once max rounds (if configured) has been reached, a throw that doesn't
   * itself check out (a normal continuing score, or a bust via noScore())
   * can't just advance to the next player indefinitely - the scorer is
   * asked whether the opponent already checked out (a normal Loss) before
   * falling back to a bull-off.
   */
  function onOpponentCheckedOutResult(opponentCheckedOut: boolean) {
    showOpponentCheckedOutPopup.value = false

    if (opponentCheckedOut) {
      matchDataStore.completeSelectedLeg('Loss', 0)
      emit('legComplete')
    } else {
      showBullOffPopup.value = true
    }
  }

  function onBullOffResult(won: boolean) {
    showBullOffPopup.value = false
    matchDataStore.completeSelectedLegByBullOff(won ? 'Win' : 'Loss')
    emit('legComplete')
  }

  // Which round the *next* throw would fall in - once a non-checkout throw
  // in this round has reached the game's configured max round (if any), it's
  // followed by the "did opponent check out?" / bull-off prompts instead of
  // just advancing to the next player. The max round itself is the last one
  // played normally - no extra round beyond it is required first.
  const currentRoundNumber = computed(() => {
    const throwCount = matchDataStore.selectedLeg?.score.length ?? 0
    const playerCount = matchDataStore.selectedGame?.players.length ?? 1
    return currentRound(throwCount, playerCount)
  })

  const scoreValue = ref('')
  const error = ref('')

  // Live preview of what this throw would leave, before Submit is pressed.
  const previewRemaining = computed(() => {
    if (!scoreValue.value) return null
    const typed = Number(scoreValue.value)
    if (Number.isNaN(typed)) return null
    return remainingScore.value - typed
  })

  // Mirrors submit()'s own bust condition, so the preview never disagrees
  // with what pressing Submit is about to do.
  const wouldBust = computed(() => {
    if (previewRemaining.value === null) return false
    return previewRemaining.value < 0 || previewRemaining.value === 1
  })

  function pressDigit(digit: string) {
    // No legal dart score is more than 3 digits (max 180).
    if (scoreValue.value.length >= 3) return
    scoreValue.value = scoreValue.value === '0' ? digit : scoreValue.value + digit
  }

  function backspace() {
    scoreValue.value = scoreValue.value.slice(0, -1)
  }

  function clearValue() {
    scoreValue.value = ''
    error.value = ''
  }

  // Keyboard support alongside the on-screen keypad, for laptop/desktop use:
  // digits build the score the same way tapping does, Backspace erases,
  // Enter submits. Scoped to this component's lifetime and skipped while
  // the console isn't actively taking throws, or any popup is open, so it
  // never fires as a side effect of typing somewhere else on the page.
  function handleKeydown(e: KeyboardEvent) {
    if (!started.value || props.readonly) return
    if (showBullPopup.value || showCheckoutDartsPopup.value || showOpponentCheckedOutPopup.value || showBullOffPopup.value) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

    if (e.key >= '0' && e.key <= '9') {
      pressDigit(e.key)
      e.preventDefault()
    } else if (e.key === 'Backspace') {
      backspace()
      e.preventDefault()
    } else if (e.key === 'Enter') {
      submit()
      e.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    // Resuming an already in-progress game lands here already `started` -
    // the watch() above only catches the false->true transition, so this
    // covers the "was already true on mount" case with the same scroll.
    if (started.value) actionRowEl.value?.scrollIntoView({ block: 'end' })
  })
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  function validateScore(value: string): boolean {
    // Only allow integers between 0 and 180
    const num = Number(value)
    if (!value) {
      error.value = 'Please enter a score.'
      return false
    }
    if (!/^\d+$/.test(value)) {
      error.value = 'Score must be a positive integer.'
      return false
    }
    if (num < 0 || num > 180) {
      error.value = 'Score must be between 0 and 180.'
      return false
    }
    // Not every number in 0-180 is actually throwable with 3 real darts
    // (e.g. 179) - reject anything a dartboard can't produce.
    if (!isValidDartScore(num)) {
      error.value = `${num} isn't a score that's possible with up to 3 darts.`
      return false
    }
    error.value = ''
    return true
  }

  /** Advances to the next player, unless this throw's round has reached the game's configured max rounds - then the leg must be resolved via the opponent-checkout/bull-off prompts instead. */
  function handlePostThrow(throwRound: number) {
    const maxRounds = matchDataStore.selectedGame?.maxRounds ?? null
    if (isBullOffRound(throwRound, maxRounds)) {
      showOpponentCheckedOutPopup.value = true
    } else {
      getNextPlayer()
    }
  }

  function submit() {
    if (!validateScore(scoreValue.value)) {
      return
    }

    if (!matchDataStore.currentPlayer || !matchDataStore.selectedLeg) return

    // Capture which round this throw belongs to before recording it -
    // handlePostThrow() only applies once the throw itself didn't check out.
    const throwRound = currentRoundNumber.value

    //Identify if the score will bust the result, ie send it to be less than 0
    if (matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) < 0 || matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) === 1) {
      noScore()
    }
    //Identify if the score will finish the leg
    else if (matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) === 0) {
      // A checkout must be reachable with the last dart landing on a double -
      // reject a score that finishes the leg but has no such combination
      // (e.g. leaving exactly 1, or a total like 159/162/165/168).
      if (!isValidCheckoutScore(Number(scoreValue.value))) {
        error.value = `${scoreValue.value} can't be checked out - the last dart must land on a double.`
        return
      }

      const scoreEntry: Record<string, number> = { [matchDataStore.currentPlayer]: Number(scoreValue.value) }
      matchDataStore.updateSelectedLegScore(scoreEntry)
      saveLegProgressInBackground()

      showCheckoutDartsPopup.value = true
    }
    else {
      //set the score in the data store
      const scoreEntry: Record<string, number> = { [matchDataStore.currentPlayer]: Number(scoreValue.value) }
      matchDataStore.updateSelectedLegScore(scoreEntry)
      saveLegProgressInBackground()

      handlePostThrow(throwRound)
    }
    //reset the score
    scoreValue.value = ''
  }

  function getNextPlayer() {
    const game = matchDataStore.selectedGame
    const currentPlayerId = matchDataStore.getCurrentPlayer()

    if (!game || !Array.isArray(game.players) || game.players.length === 0 || !currentPlayerId) return

    const currentIndex = game.players.findIndex((id) => id === currentPlayerId)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % game.players.length

    const nextPlayerId = game.players[nextIndex]
    if (nextPlayerId) {
      matchDataStore.setNextPlayerTurn(nextPlayerId)
    }
  }

  function noScore() {
    if (!matchDataStore.currentPlayer) return

    // Captured before recording the throw, same as submit()'s own throwRound -
    // called both directly (No Score button) and internally from submit()'s
    // bust branch, so it must be self-sufficient rather than relying on a
    // caller-supplied round.
    const throwRound = currentRoundNumber.value

    //set the score in the data store
    const scoreEntry: Record<string, number> = { [matchDataStore.currentPlayer]: Number(0) }

    matchDataStore.updateSelectedLegScore(scoreEntry)
    saveLegProgressInBackground()

    handlePostThrow(throwRound)

    //reset the score
    scoreValue.value = ''
  }
</script>

<style scoped>
  .scoring-console {
    container-type: inline-size;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
    padding: clamp(1.25rem, 4cqw, 2.25rem);
    display: flex;
    flex-direction: column;
    gap: clamp(0.75rem, 2.4cqw, 1.5rem);
    box-sizing: border-box;
  }

  .console-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .turn {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .turn-dot {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    flex: none;
    box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.12);
  }

  .turn-text { min-width: 0; }

  .turn-heading {
    margin: 0;
    font-size: clamp(1.05rem, 3.4cqw, 1.3rem);
    font-weight: 700;
    color: #2c3e50;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .turn-meta {
    font-size: 0.78rem;
    color: #7f8c9a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .header-chips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .games-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #f8f9fa;
    border: 1px solid #e4e8eb;
    color: #2c3e50;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    flex: none;
  }

    .games-chip:hover {
      background: #eaf4fc;
      border-color: #3498db;
    }

    .games-chip .chev {
      color: #7f8c9a;
      font-size: 0.7rem;
    }

  .bull-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #fdecea;
    border: 1px solid transparent;
    color: #e74c3c;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    flex: none;
  }

    .bull-chip.won {
      background: #e6f6ec;
      color: #1f8a4c;
    }

    .bull-chip:hover {
      opacity: 0.8;
    }

    .bull-chip .edit-icon {
      font-size: 0.75rem;
      opacity: 0.7;
    }

  .error-message {
    color: #e74c3c;
    font-size: 0.95rem;
    text-align: center;
  }

  .hero-zone { position: relative; text-align: center; }

  .hero-round {
    position: absolute;
    top: 0;
    left: 0;
    font-size: 0.78rem;
    font-weight: 700;
    color: #7f8c9a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero-score {
    font-size: clamp(3rem, 16cqw, 7rem);
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: #2c3e50;
  }

  .hero-caption {
    margin-top: 0.4rem;
    min-height: 1.4em;
    font-size: clamp(0.95rem, 3cqw, 1.15rem);
    font-weight: 600;
    color: #7f8c9a;
  }

  .hero-caption.is-preview { color: #3498db; }
  .hero-caption.is-bust { color: #e74c3c; }

  .keypad-display {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    border: 1px solid #e4e8eb;
    border-radius: 12px;
    padding: 0.6rem 1rem;
  }

  .keypad-value {
    font-size: clamp(1.5rem, 5cqw, 2.1rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #2c3e50;
  }

  .keypad-value.placeholder { color: #7f8c9a; font-weight: 500; }

  .keypad-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .key {
    flex: 1 1 5.5rem;
    min-width: 3.4rem;
    min-height: 3.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(1.05rem, 3.6cqw, 1.35rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #2c3e50;
    background: #fff;
    border: 1px solid #e4e8eb;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

    .key:hover { background: #eaf4fc; border-color: #3498db; }

  .key.wide {
    flex-grow: 1.5;
    color: #7f8c9a;
    font-size: clamp(0.9rem, 3cqw, 1.05rem);
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .btn {
    flex: 1 1 9rem;
    padding: 0.85rem 1.2rem;
    font-size: clamp(0.95rem, 3cqw, 1.08rem);
    font-weight: 700;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }

  .btn-primary { background: #2c3e50; color: #fff; }
  .btn-primary:hover { background: #34495e; }

  .btn-secondary { background: #888; color: #fff; }
  .btn-secondary:hover { background: #555; }

  .btn-neutral { background: #fdecea; color: #e74c3c; }
  .btn-neutral:hover { opacity: 0.85; }

  .quiet-row {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .btn-quiet {
    background: none;
    border: none;
    color: #7f8c9a;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.35rem 0.4rem;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

    .btn-quiet:hover { color: #e74c3c; }
</style>
