<template>
  <div class="match-control-layout">
    <div class="left-panel">
      <GameSummaryPanel :match-id="props.matchId"
                        :next-match-date="props.nextMatchDate"
                        :opposition="props.opposition"
                        :selected-game-id="selectedGameId ?? ''"
                        :disabled="!showHoldingScreen"
                        :refresh-key="refreshKey"
                        @select-game="handleSelectGame" />
    </div>
    <div class="center-panel">
      <SelectPlayersGameControl v-if="selectedGameId && selectedGame && selectedGame?.status=='Pending'"
                                :game-type="selectedGame?.type"
                                :selected-match-players="selectedPlayersForGame"
                                :gameId="selectedGameId"
                                @save="handleSave"
                                @cancel="handleCancel" />

      <MatchCenter v-else-if="selectedGameId && selectedGame && selectedGame?.status=='Ready'"
                   class="match-center"
                   :game-type="selectedGame?.type"
                   @back="handleMatchCenterBack" />

      <HoldingScreenControl v-else-if="showHoldingScreen"
                            @exit="handleExit" />

      <AvailablePlayersControl v-else
                               :match-id="props.matchId"
                               :available-players="props.availablePlayers"
                               @proceed="handleProceed"
                               @back="$emit('back')" />

    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import GameSummaryPanel from './MatchControl/GameSummaryPanel.vue'
  import AvailablePlayersControl from './MatchControl/AvailablePlayersControl.vue'
  import HoldingScreenControl from './MatchControl/HoldingScreenControl.vue'
  import SelectPlayersGameControl from './MatchControl/SelectPlayersGameControl.vue'
  import MatchCenter from './MatchControl/MatchCenter.vue'

  const props = defineProps<{
    matchId: string
    availablePlayers: string[]
    nextMatchDate: string
    opposition: string
  }>()

  interface Game {
    id: string
    players: string[]
    type: string
    status: string
    result: string
  }

  const emit = defineEmits(['back'])
  const refreshKey = ref(0)

  const selectedPlayersForGame = ref<string[]>([]);
  const showHoldingScreen = ref(false)
  const selectedGameId = ref<string | null>(null)
  const selectedGame = ref<Game | null > (null)
  const loading = ref(true)
  const error = ref('')

  function handleProceed(selectedPlayerIds: string[]) {
    selectedPlayersForGame.value = [...selectedPlayerIds];
    showHoldingScreen.value = true
  }

  async function handleSelectGame(gameId: string) {
    selectedGameId.value = gameId
    loading.value = true
    error.value = ''
    try {
      const response = await fetch(`http://localhost:5001/api/Game/${gameId}`)
      if (!response.ok) throw new Error('Failed to fetch Game')
      const data = await response.json()
      selectedGame.value = {
        id: data.id,
        players: data.data?.playerIds,
        type: data.data?.type,
        status: data.data?.status,
        result: data.data?.result,
      }
    } catch (err: any) {
      error.value = err.message || 'Error fetching games'
    } finally {
      loading.value = false
    }

    showHoldingScreen.value = false
  }
  function handleSave() {
    selectedGameId.value = null
    selectedGame.value = null
    refreshKey.value++ // This will trigger GameSummaryPanel to refresh
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
