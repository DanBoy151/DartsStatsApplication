<template>
  <div class="match-center">
    <ScoringConsole @start-match="onStartMatch"
                    @back-match="$emit('back')"
                    @cancel-match="$emit('back')"
                    @finish-leg="onFinishLeg"
                    @edit-players="$emit('edit-players')"
                    @legComplete="onFinishLeg"
                    @open-games="showDrawer = true"
                    @update-won-bull="onUpdateWonBull"
                    :game-type="props.game?.type"
                    :gamestarted="started"
                    :readonly="isComplete"
                    :game-number="currentGameNumber"
                    :games-total="gamesTotal" />

    <div class="secondary-row">
      <!-- No disabled/pointer-events-blocking class here: the ledger is
           read-only display with nothing to protect from accidental
           interaction (unlike stats, which has nothing to protect either -
           both are always plain reference info now, not gated on started). -->
      <ScoreLedgerPanel :editable="started && !isComplete" />
      <StatsPanel />
    </div>

    <!-- New leg on an existing game once past the league's late cutover:
         play on, or let a throw for bull decide the whole game. -->
    <LateNightChoiceControl v-if="showLegChoice" :allow-single-leg="false" @choose="onLegChoice" />
    <WonBullControl v-if="showLegBull" :player-names="gamePlayerNames" @result="onLegBullResult" />

    <GameListDrawer v-if="showDrawer"
                    :selected-game-id="props.game?.id ?? ''"
                    @close="showDrawer = false"
                    @select-game="onDrawerSelectGame" />

  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { defineProps, defineEmits } from 'vue'
  import ScoreLedgerPanel from './MatchCenter/ScoreLedgerPanel.vue'
  import ScoringConsole from './MatchCenter/ScoringConsole.vue'
  import StatsPanel from './MatchCenter/StatsPanel.vue'
  import GameListDrawer from './MatchCenter/GameListDrawer.vue'
  import LateNightChoiceControl, { type LateNightChoice } from './MatchCenter/LateNightChoiceControl.vue'
  import WonBullControl from './MatchCenter/WonBullControl.vue'
  import { isPastLateCutoverAEST } from '@/utils/dateFormat'
  import { startGame, fetchLegs, completeGame, createNextLeg, updateWonBull } from '@/actions/GameService'
  import type { Game } from '@/models/GameModel'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { startLeg, completeLeg, completeLegByBullOff } from '@/actions/LegService'
  import { updateMatchScore } from '@/actions/MatchService'
  import { isGameDecided, isMatchComplete, nextPlayerId } from '@/models/gameProgress'

  const matchDataStore = useMatchDataStore()

  // 'back' is manual navigation (Back/Cancel) that returns to the holding
  // screen to pick another game. 'game-complete' is specifically a game (or
  // the whole match) finishing - MatchControl/MainContent route that all the
  // way back to the main screen and force-refresh the store instead.
  // 'select-game' forwards the games drawer's own selection up to
  // MatchControl.vue, which already knows how to handle it (the same path
  // its own GameSummaryPanel instance uses).
  const emit = defineEmits(['back', 'edit-players', 'game-complete', 'select-game', 'finish-match'])

  const props = defineProps<{
    game: Game
  }>()

  const started = ref(false)
  const wonBull = ref<boolean | null>(null)
  const isComplete = computed(() => matchDataStore.getSelectedGame()?.status === 'Complete')
  const showDrawer = ref(false)

  const gamesTotal = computed(() => matchDataStore.match?.games?.length ?? 0)
  // 1-based position of the currently viewed game within the match's fixed
  // running order (game.order is 0-based - trebles, then doubles, then
  // singles) - not a count of Completed games, which would still read one
  // behind while playing the last game in the list (e.g. "10 / 11" instead
  // of "11 / 11").
  const currentGameNumber = computed(() => (props.game?.order ?? 0) + 1)

  function onDrawerSelectGame() {
    showDrawer.value = false
    emit('select-game')
  }

  async function onFinishLeg() {
    started.value= false
    //update the leg information within the store and the server
    // Must await: finishGame() (below) may call completeGame(), and the
    // server rejects completing a game while any of its legs aren't yet
    // marked Completed - racing ahead of this PUT resolving meant that
    // check always failed.
    // A leg decided by bull-off was completed locally by ScoringConsole
    // calling completeSelectedLegByBullOff() - calling the normal
    // completeLeg() here would hit the normal endpoint, which the server
    // now rejects once a leg is past its max rounds.
    if (matchDataStore.selectedLeg?.wonByBullOff) {
      await completeLegByBullOff()
    } else {
      await completeLeg()
    }
    matchDataStore.doneWithSelectedLeg()

    if (!matchDataStore.selectedGame) return;

    // The game is over once every leg has been played, or one side has
    // already won enough legs that the outcome can't change (e.g. 2-0 in a
    // best-of-3 Singles game - the 3rd leg would be pointless). Prefer the
    // game's actual configured leg count (from its League) over the
    // gameType default.
    if (isGameDecided(matchDataStore.selectedGame.legs, matchDataStore.selectedGame.type, matchDataStore.selectedGame.legsToPlay)) {
      await finishGame()
    }
    else if (needsLateLegChoice()) {
      showLegChoice.value = true
    }
    else {
      await startNextLeg()
    }
  }

  // A game already started normally after the cutover (playMode set) has had
  // its say; one started before the cutover (playMode null) is asked at each
  // further leg once the cutover passes.
  function needsLateLegChoice() {
    const game = matchDataStore.selectedGame
    if (!game || game.playMode) return false
    return isPastLateCutoverAEST(new Date(), matchDataStore.match?.date, game.lateCutoverTime)
  }

  const showLegChoice = ref(false)
  const showLegBull = ref(false)

  const gamePlayerNames = computed(() => {
    const players = matchDataStore.selectedGame?.players ?? []
    return players
      .map((id) => matchDataStore.matchAvailablePlayers.find((p) => p.playerId === id)?.name ?? id)
      .join(' / ')
  })

  async function onLegChoice(choice: LateNightChoice) {
    showLegChoice.value = false
    if (choice === 'ThrowForBull') {
      showLegBull.value = true
    } else {
      await startNextLeg()
    }
  }

  // The bull decides the whole game - its result replaces whatever the legs
  // played so far would have given.
  async function onLegBullResult(won: boolean) {
    showLegBull.value = false
    await finishGame(won ? 'Win' : 'Loss', true)
  }

  async function startNextLeg() {
    // Legs are created one at a time, on demand - not all pre-created when
    // the game starts - so the next leg has to be created here rather than
    // just found already sitting Pending in the store.
    const nextLeg = await createNextLeg()
    if (!nextLeg) return;

    matchDataStore.setSelectedLeg(nextLeg.legId)
    await startLeg()

    const game = matchDataStore.selectedGame;
    if (!game) return;
    const firstPlayer = game.players[0] ?? ''
    matchDataStore.setNextPlayerTurn(firstPlayer)
    started.value = true
  }

  async function finishGame(bullResult?: string, throwForBull = false) {
    //if the game has finished then update the server
    let result = bullResult ?? "";
    if (!bullResult) {
      // Count wins and losses in the selected game's legs
      const legs = matchDataStore.selectedGame?.legs ?? [];
      const wins = legs.filter(leg => leg.result === "Win").length;
      const losses = legs.filter(leg => leg.result === "Loss").length;
      result = wins > losses ? "Win" : "Loss"
    }

    await completeGame(result, throwForBull)
    await updateMatchScore(result === "Win")
    await afterGameComplete()
  }

  // Shared tail for a game finishing by its legs, a mid-game throw for bull,
  // or a throw for bull chosen at the start (which never has legs).
  async function afterGameComplete() {
    matchDataStore.doneWithSelectedGame()

    // Once every game in the match is Complete, ask the scorer to confirm
    // before finishing the match - hold off on emitting 'game-complete'
    // (which would otherwise redirect back to the main screen) until that's
    // resolved. Finishing a game that *doesn't* end the match returns to the
    // holding screen as normal, so the captain can go straight into the
    // match's next game without detouring through the main screen.
    if (isMatchComplete(matchDataStore.match?.games ?? [])) {
      emit('finish-match')
    } else {
      emit('back')
    }
  }

  function hasGameStarted() {
    const game = matchDataStore.getSelectedGame()
    return game?.status === 'InProgress'
  }

  // Re-derives `started` every time a DIFFERENT game is selected (not just
  // on mount) - the games drawer lets the captain switch games in place,
  // without unmounting/remounting MatchCenter, so relying on onMounted alone
  // left `started` frozen at whatever the first-selected game's status was.
  // Switching from an InProgress game to a Ready one then still showed the
  // active scoring keypad instead of the Ready screen, looking broken/blank.
  watch(
    () => props.game.id,
    () => {
      started.value = hasGameStarted()
    },
    { immediate: true }
  )

  // currentPlayer is otherwise only ever set explicitly, from
  // onStartMatch()/startNextLeg() - which never run when RESUMING a game
  // that's already In Progress (as opposed to freshly starting one), so it
  // stayed null and ScoringConsole's submit()/noScore() silently no-op.
  // Deriving it here from how many throws the current leg already has
  // restores it correctly on resume, and is a harmless no-op the rest of
  // the time (it agrees with whatever onStartMatch()/startNextLeg()/normal
  // play already set). immediate:true covers selectedLeg already being
  // populated by the time this component mounts; the watch itself covers
  // it arriving slightly later, and every leg transition after that.
  watch(
    () => matchDataStore.selectedLeg,
    (leg) => {
      if (!leg) return
      const game = matchDataStore.selectedGame
      if (!game) return
      const playerId = nextPlayerId(leg.score.length, game.players)
      if (playerId) {
        matchDataStore.setNextPlayerTurn(playerId)
      }
    },
    { immediate: true }
  )

  async function onUpdateWonBull(newWonBull: boolean) {
    await updateWonBull(newWonBull)
  }

  async function onStartMatch(payload: { wonBull: boolean, playMode: LateNightChoice | null }) {
    wonBull.value = payload.wonBull

    if (payload.playMode === 'ThrowForBull') {
      // Decided by the bull alone: the server completes the game on start
      // (wonBull is the result), with no legs created or played.
      await startGame(wonBull.value, payload.playMode)
      await updateMatchScore(wonBull.value)
      await afterGameComplete()
      return
    }

    started.value = true
    await startGame(wonBull.value, payload.playMode)
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
  .match-center {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .secondary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
  }
</style>
