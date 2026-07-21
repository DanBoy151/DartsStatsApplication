<template>
  <div class="enter-score-panel">
    <div class="turn-banner">
      <h2>Next Player: {{ currentPlayerName }}</h2>
      <span class="turn-remaining">{{ currentRemaining }} remaining</span>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="keypad-display">
      <span class="keypad-value">{{ scoreValue || '0' }}</span>
      <span class="keypad-preview" :class="{ bust: wouldBust }">
        <template v-if="previewRemaining !== null">{{ wouldBust ? 'Bust' : `→ ${previewRemaining}` }}</template>
      </span>
    </div>

    <div class="keypad-grid">
      <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
              :key="d"
              type="button"
              class="key"
              :data-key="d"
              @click="pressDigit(d)">{{ d }}</button>
      <button type="button" class="key key-wide" data-key="clear" @click="clearValue">Clear</button>
      <button type="button" class="key" data-key="0" @click="pressDigit('0')">0</button>
      <button type="button" class="key key-wide" data-key="backspace" aria-label="Erase last digit" @click="backspace">⌫</button>
    </div>

    <div class="action-row">
      <button class="no-score-btn" type="button" @click="noScore">No Score</button>
      <button class="submit-btn" type="button" @click="submit">Submit</button>
    </div>

    <DoublesFinishControl v-if="showDartsDoublePopup"
                          @result="onDoublesFinishResult" />
    <OpponentCheckedOutControl v-if="showOpponentCheckedOutPopup"
                          @result="onOpponentCheckedOutResult" />
    <BullOffControl v-if="showBullOffPopup"
                    @result="onBullOffResult" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { currentRound, isBullOffRound } from '@/models/gameProgress'
  import DoublesFinishControl from './DoublesFinishControl.vue'
  import OpponentCheckedOutControl from './OpponentCheckedOutControl.vue'
  import BullOffControl from './BullOffControl.vue'

  const props = defineProps<{
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'legComplete'): void
  }>()

  const showDartsDoublePopup = ref(false)
  const showOpponentCheckedOutPopup = ref(false)
  const showBullOffPopup = ref(false)

  const matchDataStore = useMatchDataStore()

  const currentPlayerName = computed(() => {
    const playerId = matchDataStore.currentPlayer;
    if (!playerId) return '';
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId);
    return player ? player.name : '';
  });

  const currentRemaining = computed(() => matchDataStore.selectedLeg?.remainingScore ?? 0)

  // Which round the *next* throw would fall in - once a non-checkout throw
  // in this round is past the game's configured max rounds (if any), it's
  // followed by the "did opponent check out?" / bull-off prompts instead of
  // just advancing to the next player.
  const currentRoundNumber = computed(() => {
    const throwCount = matchDataStore.selectedLeg?.score.length ?? 0
    const playerCount = matchDataStore.selectedGame?.players.length ?? 1
    return currentRound(throwCount, playerCount)
  })

  const scoreValue = ref('');
  const error = ref('');
  const doubleFinishResult = ref<number | null>(null)

  // Live preview of what this throw would leave, before Submit is pressed.
  const previewRemaining = computed(() => {
    if (!scoreValue.value) return null
    const typed = Number(scoreValue.value)
    if (Number.isNaN(typed)) return null
    return currentRemaining.value - typed
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
  // the panel is disabled (leg not started/complete) or the checkout
  // darts-count popup is open, so it never fires as a side effect of
  // typing somewhere else on the page.
  function handleKeydown(e: KeyboardEvent) {
    if (props.disabled || showDartsDoublePopup.value || showOpponentCheckedOutPopup.value || showBullOffPopup.value) return
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

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  function validateScore(value: string): boolean {
    // Only allow integers between 0 and 180
    const num = Number(value);
    if (!value) {
      error.value = 'Please enter a score.';
      return false;
    }
    if (!/^\d+$/.test(value)) {
      error.value = 'Score must be a positive integer.';
      return false;
    }
    if (num < 0 || num > 180) {
      error.value = 'Score must be between 0 and 180.';
      return false;
    }
    error.value = '';
    return true;
  }
  function onDoublesFinishResult(result: number) {
    doubleFinishResult.value = result
    showDartsDoublePopup.value = false

    matchDataStore.completeSelectedLeg('Win', Number(doubleFinishResult.value))

    emit('legComplete')
  }

  /**
   * Once max rounds (if configured) has been passed, a throw that doesn't
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

  /** Advances to the next player, unless this throw's round is past the game's configured max rounds - then the leg must be resolved via the opponent-checkout/bull-off prompts instead. */
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
      return;
    }

    if (!matchDataStore.currentPlayer || !matchDataStore.selectedLeg) return;

    // Capture which round this throw belongs to before recording it -
    // handlePostThrow() only applies once the throw itself didn't check out.
    const throwRound = currentRoundNumber.value

    //Identify if the score will bust the result, ie send it to be less than 0
    if (matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) < 0 || matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) === 1 ) {
      noScore();
    }
    //Identify if the score will finish the leg
    else if (matchDataStore.selectedLeg?.remainingScore - Number(scoreValue.value) === 0) {
      const score: Record<string, number> = { [matchDataStore.currentPlayer]: Number(scoreValue.value) };
      matchDataStore.updateSelectedLegScore(score);

      showDartsDoublePopup.value = true
    }
    else {
      //set the score in the data store
      const score: Record<string, number> = { [matchDataStore.currentPlayer]: Number(scoreValue.value) };
      matchDataStore.updateSelectedLegScore(score);

      handlePostThrow(throwRound)
    }
  //reset the score
  scoreValue.value = '';
  }

  function getNextPlayer() {

  const game = matchDataStore.selectedGame;
  const currentPlayerId = matchDataStore.getCurrentPlayer()

  if (!game || !Array.isArray(game.players) || game.players.length === 0 || !currentPlayerId) return;

  const currentIndex = game.players.findIndex(id => id === currentPlayerId);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + 1) % game.players.length;

  const nextPlayerId = game.players[nextIndex];
  if (nextPlayerId) {
    matchDataStore.setNextPlayerTurn(nextPlayerId);
    }
  }

  function noScore() {
    if (!matchDataStore.currentPlayer) return;

    // Captured before recording the throw, same as submit()'s own throwRound -
    // called both directly (No Score button) and internally from submit()'s
    // bust branch, so it must be self-sufficient rather than relying on a
    // caller-supplied round.
    const throwRound = currentRoundNumber.value

    //set the score in the data store
    const score: Record<string, number> = { [matchDataStore.currentPlayer]: Number(0) };

    matchDataStore.updateSelectedLegScore(score);

    handlePostThrow(throwRound)

    //reset the score
    scoreValue.value = '';
  }
</script>

<style scoped>
  .enter-score-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .turn-banner {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
  }

  .turn-banner h2 {
    margin: 0;
    font-size: 1.15rem;
    color: #2c3e50;
  }

  .turn-remaining {
    font-size: 0.95rem;
    color: #7f8c8d;
    white-space: nowrap;
  }

  .keypad-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.5rem 1rem;
  }

  .keypad-value {
    font-size: 1.9rem;
    font-weight: bold;
    color: #2c3e50;
  }

  .keypad-preview {
    font-size: 1rem;
    color: #7f8c8d;
  }

  .keypad-preview.bust {
    color: #e74c3c;
    font-weight: bold;
  }

  .keypad-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .key {
    flex: 1 1 2.5rem;
    min-width: 2.5rem;
    padding: 0.5rem 0;
    text-align: center;
    font-size: 1.1rem;
    font-weight: bold;
    color: #2c3e50;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

    .key:hover {
      background: #f0f2f4;
    }

  .key-wide {
    flex: 1.4 1 3.5rem;
    color: #7f8c8d;
    font-size: 0.9rem;
  }

  .action-row {
    display: flex;
    gap: 1rem;
    margin-top: auto;
  }

  .no-score-btn {
    flex: 1;
    background: #e74c3c;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.6rem 1rem;
    font-size: 1.05rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .no-score-btn:hover {
      background: #c0392b;
    }

  .submit-btn {
    flex: 1;
    background: #2c3e50;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.6rem 1rem;
    font-size: 1.05rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .submit-btn:hover {
      background: #506E8BFF;
    }

  .error-message {
    color: #e74c3c;
    font-size: 1rem;
    text-align: center;
  }
</style>
