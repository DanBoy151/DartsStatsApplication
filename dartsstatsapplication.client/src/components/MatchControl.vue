<template>
  <div class="match-control-layout" :class="{ 'game-active': showingMatchCenter }">
    <div class="left-panel">
      <GameSummaryPanel :selected-game-id="selectedGameId ?? ''"
                        :disabled="!showHoldingScreen"
                        @select-game="handleSelectGame" />
    </div>
    <div class="center-panel">
      <SelectPlayersGameControl v-if="selectedGameId && selectedGame && (selectedGame?.status=='Pending' || editingPlayers)"
                                @save="handleSave"
                                @cancel="handleCancel" />

      <MatchCenter v-else-if="matchCenterGame"
                   class="match-center"
                   :game="matchCenterGame"
                   @back="handleMatchCenterBack"
                   @edit-players="handleEditPlayers"
                   @game-complete="emit('game-complete')"
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
  import { ref, computed } from 'vue'
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

  // 'back' (manual Back/Cancel navigation) is used implicitly via $emit in
  // the template (AvailablePlayersControl). 'game-complete' needs an
  // explicit emit() to relay MatchCenter's own 'game-complete' straight
  // through, bypassing the holding screen.
  const emit = defineEmits(['back', 'game-complete'])

  const showHoldingScreen = ref(false)
  const selectedGameId = ref<string | null>(null)
  const selectedGame = ref<Game | null > (null)
  // True while editing an already-Ready game's roster (RemainingScorePanel's
  // "Edit Players" button) - distinct from selectedGame.status === 'Pending',
  // which is a fresh game that's never had players assigned at all.
  const editingPlayers = ref(false)

  // Single source of truth for "MatchCenter is what's showing right now" -
  // used both for :game (a non-null Game, so v-else-if="matchCenterGame"
  // narrows the same way the old inline condition did) and for collapsing
  // the left rail (GameSummaryPanel) below 1024px (see <style> below), since
  // its job - picking a game to view - isn't useful mid-scoring.
  const matchCenterGame = computed<Game | null>(() => {
    if (!selectedGameId.value || !selectedGame.value) return null
    const status = selectedGame.value.status
    return status === 'Ready' || status === 'InProgress' || status === 'Complete' ? selectedGame.value : null
  })
  const showingMatchCenter = computed(() => matchCenterGame.value !== null)

  //Need to update this and the Prop into the next screen
  function handleProceed() {
    showHoldingScreen.value = true
  }

  async function handleSelectGame() {
    selectedGameId.value = matchDataStore.getSelectedGame()?.gameId || null
    selectedGame.value =  convertToGameFromGameDataState(matchDataStore.getSelectedGame())

    showHoldingScreen.value = false
    editingPlayers.value = false

    // Whatever leg/current-player was selected belongs to the PREVIOUS
    // game - clear it before possibly reselecting below, so a fresh/
    // not-yet-started game (no legs of its own yet) doesn't leak the old
    // game's scores/next-player into ScoreLedgerPanel/EnterScorePanel.
    matchDataStore.clearSelectedLeg()

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
    editingPlayers.value = false
    showHoldingScreen.value = true
  }
  function handleCancel() {
    selectedGameId.value = null
    selectedGame.value = null
    editingPlayers.value = false
    showHoldingScreen.value = true
  }
  function handleExit() {
    showHoldingScreen.value = false
    selectedGameId.value = null
    editingPlayers.value = false
  }

  function handleMatchCenterBack() {
    showHoldingScreen.value = true
    selectedGameId.value = null
    selectedGame.value = null
    editingPlayers.value = false
  }

  /** RemainingScorePanel's "Edit Players" button, only available while a game is Ready (not yet started). */
  function handleEditPlayers() {
    editingPlayers.value = true
  }
</script>

<style scoped>
  /* Anchored to <main> (see App.vue's `position: relative`), not the
     viewport - position:fixed here covered the header too, making the menu
     bar unclickable while a match was in progress. */
  .match-control-layout {
    position: absolute;
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

  /* Below tablet/laptop width, .left-panel's fixed 380px (min 320px) basis
     doesn't fit beside anything - on a ~390px phone it alone leaves .center-
     panel ~0 width, hiding whatever's in it (holding screen, roster
     selection, AvailablePlayersControl - not just MatchCenter). Stack
     vertically instead of side-by-side so every one of those screens stays
     usable, then - once a game is actually active - drop the rail
     entirely, since GameSummaryPanel's job (picking a game to view) isn't
     useful mid-scoring and MatchCenter needs the full width instead. */
  @media (max-width: 1024px) {
    .match-control-layout {
      flex-direction: column;
      overflow-y: auto;
    }

    .left-panel {
      flex: 0 0 auto;
      width: 100%;
      min-width: 0;
      max-width: none;
      height: auto;
      max-height: 45vh;
      padding: 1rem;
      justify-content: center;
    }

    .center-panel {
      flex: 1 1 auto;
      width: 100%;
      min-height: 0;
      padding: 1.25rem;
    }

    .center-panel > .match-center {
      padding: 1.25rem;
    }

    .match-control-layout.game-active .left-panel {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .left-panel {
      padding: 0.75rem;
      max-height: 40vh;
    }

    .center-panel {
      padding: 0.75rem;
    }

    .center-panel > .match-center {
      padding: 0.75rem;
    }
  }
</style>
