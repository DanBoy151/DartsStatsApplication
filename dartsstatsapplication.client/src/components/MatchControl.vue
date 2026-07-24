<template>
  <div class="match-control-layout">
    <!-- GameSummaryPanel's job - picking a game to view - isn't useful
         mid-scoring, and its fixed width has nothing to do with what
         MatchCenter itself needs, so it's dropped from layout entirely
         while a game is active - MatchCenter's own drawer (GameListDrawer)
         gives on-demand access to the same list instead (see @select-game
         below, which routes back through the same handler either way). -->
    <div v-if="!showingMatchCenter" class="left-panel">
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
                   @select-game="handleSelectGame"
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
  // True while editing an already-Ready game's roster (ScoringConsole's
  // "Edit Players" button) - distinct from selectedGame.status === 'Pending',
  // which is a fresh game that's never had players assigned at all.
  const editingPlayers = ref(false)

  // Single source of truth for "MatchCenter is what's showing right now" -
  // used both for :game (a non-null Game, so v-else-if="matchCenterGame"
  // narrows the same way the old inline condition did) and for dropping the
  // left rail (GameSummaryPanel) entirely while a game is active (see the
  // template's v-if="!showingMatchCenter") - its job, picking a game to
  // view, isn't useful mid-scoring, and MatchCenter's own drawer covers it.
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
    /* "safe" falls back to start-aligned (scrollable from the top) instead
       of clipping symmetrically top-and-bottom if content is ever taller
       than the viewport - MatchCenter's new console+ledger+stats stack has
       no fixed height (unlike the old grid), so this can genuinely happen
       on a short window. */
    align-items: safe center;
    justify-content: center; /* Center horizontally */
    min-width: 0;
    min-height: 0;
    padding: 2rem;
    box-sizing: border-box;
    overflow-y: auto;
  }

    /* MatchCenter (and only MatchCenter - other center-panel children size
       to their own content) caps at a comfortable reading width instead of
       stretching edge-to-edge on a wide monitor; its own children
       (ScoringConsole, the ledger/stats cards) supply their own padding, so
       no padding is added here. */
    .center-panel > .match-center {
      width: min(1100px, 94vw);
      box-sizing: border-box;
    }

  /* Below tablet/laptop width, .left-panel's fixed 380px (min 320px) basis
     doesn't fit beside anything - on a ~390px phone it alone leaves .center-
     panel ~0 width, hiding whatever's in it (holding screen, roster
     selection, AvailablePlayersControl). Stack vertically instead of
     side-by-side so every one of those screens stays usable. (MatchCenter
     itself never shares this row with .left-panel at all any more - see
     the template's v-if - so it isn't a factor here.) */
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
  }

  @media (max-width: 600px) {
    .left-panel {
      padding: 0.75rem;
      max-height: 40vh;
    }

    .center-panel {
      padding: 0.75rem;
    }
  }
</style>
