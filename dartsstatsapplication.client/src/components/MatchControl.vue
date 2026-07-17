<template>
  <div class="match-control-layout">
    <div class="left-panel">
      <GameSummaryPanel :selected-game-id="selectedGameId ?? ''"
                        :disabled="!showHoldingScreen"
                        @select-game="handleSelectGame" />
    </div>
    <div class="center-panel">
      <SelectPlayersGameControl v-if="selectedGameId && selectedGame && selectedGame?.status=='Pending'"
                                @save="handleSave"
                                @cancel="handleCancel" />

      <MatchCenter v-else-if="selectedGameId && selectedGame && (selectedGame?.status=='Ready' || selectedGame?.status=='InProgress' || selectedGame?.status=='Complete') "
                   class="match-center"
                   :game="selectedGame"
                   @back="handleMatchCenterBack"
                   />

      <HoldingScreenControl v-else-if="showHoldingScreen"
                            @exit="handleExit" />

      <AvailablePlayersControl v-else
                               @proceed="handleProceed"
                               @back="$emit('back')" />

    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import GameSummaryPanel from './MatchControl/GameSummaryPanel.vue'
  import AvailablePlayersControl from './MatchControl/AvailablePlayersControl.vue'
  import HoldingScreenControl from './MatchControl/HoldingScreenControl.vue'
  import SelectPlayersGameControl from './MatchControl/SelectPlayersGameControl.vue'
  import MatchCenter from './MatchControl/MatchCenter.vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import type { Game } from '@/models/GameModel'
  import { convertToGameFromGameDataState } from '@/models/GameModel'
  import { lastTouchedLeg } from '@/models/gameProgress'
  import { fetchLegs } from '@/actions/GameService'

  const matchDataStore = useMatchDataStore()

  const showHoldingScreen = ref(false)
  const selectedGameId = ref<string | null>(null)
  const selectedGame = ref<Game | null > (null)


  //Need to update this and the Prop into the next screen
  function handleProceed() {
    showHoldingScreen.value = true
  }

  async function handleSelectGame() {
    selectedGameId.value = matchDataStore.getSelectedGame()?.gameId || null
    selectedGame.value =  convertToGameFromGameDataState(matchDataStore.getSelectedGame())

    showHoldingScreen.value = false

    // A game that's already been played (Ready/InProgress/Complete) has legs
    // worth showing - fetchLegs() no-ops if they're already loaded. Select
    // the last one actually played so MatchCenter opens on where things
    // stand, rather than a blank/default leg.
    if (selectedGame.value && selectedGame.value.status !== 'Pending') {
      await fetchLegs()
      const legs = matchDataStore.getSelectedGame()?.legs ?? []
      const leg = lastTouchedLeg(legs)
      if (leg) {
        matchDataStore.setSelectedLeg(leg.legId)
      }
    }
  }
  function handleSave() {
    selectedGameId.value = null
    selectedGame.value = null
    showHoldingScreen.value = true
  }
  function handleCancel() {
    selectedGameId.value = null
    selectedGame.value = null
    showHoldingScreen.value = true
  }
  function handleExit() {
    showHoldingScreen.value = false
    selectedGameId.value = null
  }

  function handleMatchCenterBack() {
    showHoldingScreen.value = true
    selectedGameId.value = null
    selectedGame.value = null
  }
</script>

<style scoped>
  .match-control-layout {
    position: fixed;
    inset: 0;
    display: flex;
    box-sizing: border-box;
  }

  .left-panel {
    flex: 0 0 380px;
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    padding: 2rem 0 1.5rem 2rem;
    min-width: 320px;
    max-width: 480px;
    height: 100%;
    box-sizing: border-box;
  }

    .left-panel :deep(.game-summary-panel) {
      max-height: 100%;
      height: auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

  .center-panel {
    flex: 1 1 0;
    display: flex;
    align-items: center; /* Center vertically */
    justify-content: center; /* Center horizontally */
    min-width: 0;
    padding: 2rem;
    box-sizing: border-box;
  }

    /* Only MatchCenter fills the panel */
    .center-panel > .match-center {
      padding: 2rem;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }
</style>
