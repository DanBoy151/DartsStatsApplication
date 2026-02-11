<template>
  <div class="match-center-grid">
    <div class="quarter score-ledger" :class="{ disabled: !started }">
      <ScoreLedgerPanel :disabled="!started" />
    </div>
    <div class="quarter remaining-score">
      <RemainingScorePanel @start-match="onStartMatch"
                           @back-match="$emit('back')"
                           @cancel-match="$emit('back')"
                           @finish-game="onFinishGame"
                           @finish-leg="onFinishLeg"
                           :game-type="selectedGame?.type"
                           :gamestarted="started" />
    </div>
    <div class="quarter enter-score" :class="{ disabled: !started }">
      <EnterScorePanel :disabled="!started" />
    </div>
    <div class="quarter stats" :class="{ disabled: !started }">
      <StatsPanel :disabled="!started" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import { defineProps, defineEmits } from 'vue'
  import ScoreLedgerPanel from './MatchCenter/ScoreLedgerPanel.vue'
  import RemainingScorePanel from './MatchCenter/RemainingScorePanel.vue'
  import StatsPanel from './MatchCenter/StatsPanel.vue'
  import EnterScorePanel from './MatchCenter/EnterScorePanel.vue'
  import { startGame, fetchLegs } from '@/actions/GameService'
  import type { Game } from '@/models/GameModel'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { startLeg } from '@/actions/LegService'

  const matchDataStore = useMatchDataStore()

  const emit = defineEmits(['back'])

  const props = defineProps<{
    game: Game
  }>()

  const selectedGame = props.game

  const started = ref(false)
  const wonBull = ref<boolean | null>(null)

  async function onFinishLeg() {
    //update the leg information within the store and the server
    matchDataStore.doneWithSelectedLeg()

    if (!matchDataStore.selectedGame) return;

    //identify if a new leg is required to be started
    if (matchDataStore.selectedGame.legs.length > 1) {
      const allLegsFinished = matchDataStore.selectedGame.legs.every(leg => leg.status == "Completed")
      if (allLegsFinished) {
        return
      }
      else {
        //start the new leg

      }
    }
  }

  async function onFinishGame() {
    //if the game has finished then update the server


    //check if the match has now finished and update server if required
    finishMatch()

  }

  async function finishMatch() {

  }
  onMounted(() => {
    if (hasGameStarted()) {
      started.value = true
    }
  });

  function hasGameStarted() {
    const game = matchDataStore.getSelectedGame()
    return game?.status === 'InProgress'
  }

  async function onStartMatch(payload: { wonBull: boolean }) {
    started.value = true
    wonBull.value = payload.wonBull
    await startGame(wonBull.value)
    //fetch leg information from server via gameID & then add to the store for later use
    await fetchLegs()
    //start first leg automatically
    const legID = matchDataStore.selectedGame?.legs[0]?.legId ?? ''
    matchDataStore.setSelectedLeg(legID)
    await startLeg()
    //set first Player to throw
    const game = matchDataStore.selectedGame;
    if (!game) return;
    const firstPlayer = game.players[0] ?? ''
    matchDataStore.setNextPlayerTurn(firstPlayer)
  }

</script>

<style scoped>
  .match-center-grid {
    display: grid;
    grid-template-columns: 2fr 1fr; /* Left wide, right narrow */
    grid-template-rows: 1fr 1fr 1fr; /* Three equal rows */
    width: 100%;
    height: 100%;
    gap: 1rem;
  }
  .quarter {
    border: 1px solid #ccc;
    box-sizing: border-box;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    background: #fff;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
  }

    .quarter > * {
      flex: 1 1 0;
      min-height: 0;
      min-width: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Disabled state for panels */
    .quarter.disabled {
      pointer-events: none;
      opacity: 0.5;
    }

  /* Grid placement for each panel */
  /* Left column */
  .score-ledger {
    grid-column: 1 / 2;
    grid-row: 1 / 3; /* Spans rows 1 and 2 */
  }

  .enter-score {
    grid-column: 1 / 2;
    grid-row: 3 / 4; /* Row 3 */
  }

  /* Right column */
  .remaining-score {
    grid-column: 2 / 3;
    grid-row: 1 / 2; /* Row 1 */
  }

  .stats {
    grid-column: 2 / 3;
    grid-row: 2 / 4; /* Spans rows 2 and 3 */
  }
</style>
