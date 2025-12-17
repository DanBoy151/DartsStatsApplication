<template>
  <div class="match-control-layout">
    <div class="left-panel">
      <GameSummaryPanel :match-id="props.matchId"
                        :next-match-date="props.nextMatchDate"
                        :opposition="props.opposition"
                        :selected-game-id="selectedGameId"
                        :disabled="!showHoldingScreen"
                        @select-game="handleSelectGame" />
    </div>
    <div class="center-panel">
      <HoldingScreenControl v-if="showHoldingScreen"
                            @exit="$emit('back')" />
      <AvailablePlayersControl v-else
                               :match-id="matchId"
                               :available-players="availablePlayers"
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

  const props = defineProps<{
    matchId: string
    availablePlayers: string[]
    nextMatchDate: string
    opposition: string
    selectedGameId?: string
  }>()

  const emit = defineEmits(['back'])

  const showHoldingScreen = ref(false)

  function handleProceed() {
    showHoldingScreen.value = true
  }

  function handleSelectGame() {
    
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
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 2rem;
    height: 100%;
    box-sizing: border-box;
  }
</style>
