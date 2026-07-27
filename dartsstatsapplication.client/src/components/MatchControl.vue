<template>
  <div class="match-control-layout">
    <div class="match-control-content">
      <SelectPlayersGameControl v-if="selectedGameId && selectedGame && (selectedGame?.status=='Pending' || editingPlayers)"
                                @save="handleSave"
                                @cancel="handleCancel" />

      <MatchCenter v-else-if="matchCenterGame"
                   class="match-center"
                   :game="matchCenterGame"
                   @back="handleMatchCenterBack"
                   @edit-players="handleEditPlayers"
                   @game-complete="emit('game-complete')"
                   @select-game="handleSelectGame"
                   />

      <GameSummaryPanel v-else-if="showHoldingScreen"
                        class="game-overview"
                        :selected-game-id="selectedGameId ?? ''"
                        @select-game="handleSelectGame"
                        @back-to-players="handleExit" />

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
  // True while editing an already-Ready game's roster (ScoringConsole's
  // "Edit Players" button) - distinct from selectedGame.status === 'Pending',
  // which is a fresh game that's never had players assigned at all.
  const editingPlayers = ref(false)

  // Single source of truth for "MatchCenter is what's showing right now" -
  // a non-null Game, so v-else-if="matchCenterGame" narrows the same way the
  // old inline condition did.
  const matchCenterGame = computed<Game | null>(() => {
    if (!selectedGameId.value || !selectedGame.value) return null
    const status = selectedGame.value.status
    return status === 'Ready' || status === 'InProgress' || status === 'Complete' ? selectedGame.value : null
  })

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
    // game's scores/next-player into ScoreLedgerPanel/ScoringConsole.
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

  /** ScoringConsole's "Edit Players" button, only available while a game is Ready (not yet started). */
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

  .match-control-content {
    flex: 1 1 0;
    display: flex;
    /* "safe" falls back to start-aligned (scrollable from the top) instead
       of clipping symmetrically top-and-bottom if content is ever taller
       than the viewport - MatchCenter's console+ledger+stats stack (and the
       merged game-overview screen below) has no fixed height, so this can
       genuinely happen on a short window. */
    align-items: safe center;
    justify-content: center; /* Center horizontally */
    min-width: 0;
    min-height: 0;
    padding: 2rem;
    box-sizing: border-box;
    overflow-y: auto;
  }

    /* MatchCenter caps at a comfortable reading width instead of stretching
       edge-to-edge on a wide monitor; its own children (ScoringConsole, the
       ledger/stats cards) supply their own padding, so no padding is added
       here. */
    .match-control-content > .match-center {
      width: min(1100px, 94vw);
      box-sizing: border-box;
    }

    /* GameSummaryPanel's own height:100%/overflow:hidden is built for its
       "drawer" use (filling GameListDrawer's fixed-height aside) - here, as
       the merged game-overview screen, it should flow to its content height
       instead and let this container's own overflow-y:auto scroll the page,
       matching MatchCenter's own convention above. */
    .match-control-content > .game-overview {
      width: min(760px, 94vw);
      height: auto;
      max-height: none;
      overflow: visible;
      box-sizing: border-box;
    }

  @media (max-width: 600px) {
    .match-control-content {
      padding: 0.75rem;
    }
  }
</style>
