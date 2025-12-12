<template>
  <div class="match-control-layout">
    <div class="left-panel">
      <GameSummaryPanel :match-id="props.matchId"
                        :nextMatchDate="props.nextMatchDate"
                        :opposition="props.opposition" />
    </div>
    <div class="center-panel">
      <AvailablePlayersControl :match-id="props.matchId"
                               :availablePlayers="props.availablePlayers"
                               @back="$emit('back')" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import GameSummaryPanel from './MatchControl/GameSummaryPanel.vue'
  import AvailablePlayersControl from './MatchControl/AvailablePlayersControl.vue'

  const props = defineProps<{
    matchId: string
    nextMatchDate: string
    opposition: string
    availablePlayers: string[]
  }>()

  const emit = defineEmits(['back'])
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
