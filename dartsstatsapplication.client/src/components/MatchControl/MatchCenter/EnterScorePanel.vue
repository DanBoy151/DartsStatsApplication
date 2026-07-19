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
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import DoublesFinishControl from './DoublesFinishControl.vue'

  const emit = defineEmits<{
    (e: 'legComplete'): void
  }>()

  const showDartsDoublePopup = ref(false)

  const matchDataStore = useMatchDataStore()

  const currentPlayerName = computed(() => {
    const playerId = matchDataStore.currentPlayer;
    if (!playerId) return '';
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId);
    return player ? player.name : '';
  });

  const currentRemaining = computed(() => matchDataStore.selectedLeg?.remainingScore ?? 0)

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

  function submit() {
    if (!validateScore(scoreValue.value)) {
      return;
    }

    if (!matchDataStore.currentPlayer || !matchDataStore.selectedLeg) return;

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

      //update the next player from the list
      getNextPlayer();
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

    //set the score in the data store
    const score: Record<string, number> = { [matchDataStore.currentPlayer]: Number(0) };

    matchDataStore.updateSelectedLegScore(score);

    //update the next player from the list
    getNextPlayer();

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
