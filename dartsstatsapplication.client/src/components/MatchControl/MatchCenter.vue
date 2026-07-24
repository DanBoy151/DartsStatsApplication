<template>
  <div class="match-center-grid" :class="`tab-${activeTab}`">
    <div class="tab-strip">
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'ledger' }"
              data-testid="match-center-tab-ledger" @click="activeTab = 'ledger'">History</button>
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'remaining' }"
              data-testid="match-center-tab-remaining" @click="activeTab = 'remaining'">Score</button>
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'enter' }"
              data-testid="match-center-tab-enter" @click="activeTab = 'enter'">Enter</button>
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'stats' }"
              data-testid="match-center-tab-stats" @click="activeTab = 'stats'">Stats</button>
    </div>
    <div class="quarter score-ledger">
      <!-- No disabled/pointer-events-blocking class here: the ledger is
           read-only display with nothing to protect from accidental
           interaction (unlike enter-score/stats), and pointer-events:none
           was blocking mouse-wheel/trackpad scrolling on a Complete game's
           full leg history, not just clicks. -->
      <ScoreLedgerPanel :editable="started && !isComplete" />
    </div>
    <div class="quarter remaining-score">
      <RemainingScorePanel @start-match="onStartMatch"
                           @back-match="$emit('back')"
                           @cancel-match="$emit('back')"
                           @finish-leg="onFinishLeg"
                           @edit-players="$emit('edit-players')"
                           :game-type="selectedGame?.type"
                           :gamestarted="started"
                           :readonly="isComplete" />
    </div>
    <div class="quarter enter-score" :class="{ disabled: !started || isComplete }">
      <EnterScorePanel @legComplete="onFinishLeg" :disabled="!started || isComplete" />
    </div>
    <div class="quarter stats" :class="{ disabled: !started || isComplete }">
      <StatsPanel :disabled="!started || isComplete" />
    </div>
    <CompleteMatchControl v-if="showCompleteMatchPopup"
                          @result="onCompleteMatchResult" />
    <PlayerOfMatchControl v-if="showPlayerOfMatchPopup"
                          :players="playerOfMatchCandidates"
                          @result="onPlayerOfMatchResult" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, onMounted, watch } from 'vue'
  import { defineProps, defineEmits } from 'vue'
  import ScoreLedgerPanel from './MatchCenter/ScoreLedgerPanel.vue'
  import RemainingScorePanel from './MatchCenter/RemainingScorePanel.vue'
  import StatsPanel from './MatchCenter/StatsPanel.vue'
  import EnterScorePanel from './MatchCenter/EnterScorePanel.vue'
  import CompleteMatchControl from './MatchCenter/CompleteMatchControl.vue'
  import PlayerOfMatchControl from './MatchCenter/PlayerOfMatchControl.vue'
  import { startGame, fetchLegs, completeGame, createNextLeg } from '@/actions/GameService'
  import type { Game } from '@/models/GameModel'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { startLeg, completeLeg, completeLegByBullOff } from '@/actions/LegService'
  import { updateMatchScore, completeMatch } from '@/actions/MatchService'
  import { isGameDecided, isMatchComplete, nextPlayerId } from '@/models/gameProgress'

  const matchDataStore = useMatchDataStore()

  // 'back' is manual navigation (Back/Cancel) that returns to the holding
  // screen to pick another game. 'game-complete' is specifically a game (or
  // the whole match) finishing - MatchControl/MainContent route that all the
  // way back to the main screen and force-refresh the store instead.
  const emit = defineEmits(['back', 'edit-players', 'game-complete'])

  const props = defineProps<{
    game: Game
  }>()

  const selectedGame = props.game

  const started = ref(false)
  const wonBull = ref<boolean | null>(null)
  const isComplete = computed(() => matchDataStore.getSelectedGame()?.status === 'Complete')
  const showCompleteMatchPopup = ref(false)
  const showPlayerOfMatchPopup = ref(false)

  // Phone-tier tab switcher (see @media (max-width: 600px) below) - desktop/
  // tablet ignore this and show every panel at once. Defaults to whichever
  // panel actually matters right now: Remaining Score (with its Start
  // button) before a leg is underway, Enter Score (the keypad, used every
  // throw) once it is - hasGameStarted() covers resuming an already
  // in-progress game, the started watcher below covers every leg after.
  type MatchCenterTab = 'ledger' | 'remaining' | 'enter' | 'stats'
  const activeTab = ref<MatchCenterTab>(hasGameStarted() ? 'enter' : 'remaining')

  // Candidates for Player of the Match: everyone who actually appeared in at
  // least one of the match's games (not just everyone marked available) -
  // matches MatchControllerValidator.IsValidPlayerOfMatch's own requirement,
  // so a selection made here can never be rejected by the server.
  const playerOfMatchCandidates = computed(() => {
    const games = matchDataStore.match?.games ?? []
    const playerIds = Array.from(new Set(games.flatMap((g) => g.players)))
    const availablePlayers = matchDataStore.getMatchAvailablePlayers()
    return playerIds.map((playerId) => {
      const found = availablePlayers.find((p) => p.playerId === playerId)
      return { playerId, name: found?.name ?? playerId }
    })
  })

  async function onFinishLeg() {
    started.value= false
    //update the leg information within the store and the server
    // Must await: finishGame() (below) may call completeGame(), and the
    // server rejects completing a game while any of its legs aren't yet
    // marked Completed - racing ahead of this PUT resolving meant that
    // check always failed.
    // A leg decided by bull-off was completed locally by
    // EnterScorePanel/RemainingScorePanel calling completeSelectedLegByBullOff()
    // - calling the normal completeLeg() here would hit the normal endpoint,
    // which the server now rejects once a leg is past its max rounds.
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
    else {
      await startNextLeg()
    }
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

  async function finishGame() {
    //if the game has finished then update the server
    // Count wins and losses in the selected game's legs
    const legs = matchDataStore.selectedGame?.legs ?? [];
    const wins = legs.filter(leg => leg.result === "Win").length;
    const losses = legs.filter(leg => leg.result === "Loss").length;

    let result = "";
    if (wins > losses) {
      result="Win"
    }
    else {
      result = "Loss"
    }

    await completeGame(result)
    await updateMatchScore((wins > losses))
    matchDataStore.doneWithSelectedGame()

    // Once every game in the match is Complete, ask the scorer to confirm
    // before finishing the match - hold off on emitting 'game-complete'
    // (which would otherwise redirect back to the main screen) until that's
    // resolved. Finishing a game that *doesn't* end the match returns to the
    // holding screen as normal, so the captain can go straight into the
    // match's next game without detouring through the main screen.
    if (isMatchComplete(matchDataStore.match?.games ?? [])) {
      showCompleteMatchPopup.value = true
    } else {
      emit('back')
    }
  }

  function onCompleteMatchResult(confirmed: boolean) {
    showCompleteMatchPopup.value = false

    if (confirmed) {
      showPlayerOfMatchPopup.value = true
    } else {
      // Not ready to finalize yet - back to the holding screen to review,
      // same as declining anything else here. Only actually completing the
      // match (below) redirects to the main screen.
      emit('back')
    }
  }

  async function onPlayerOfMatchResult(playerId: string | null) {
    showPlayerOfMatchPopup.value = false

    if (playerId) {
      await completeMatch(playerId)
    }

    emit('game-complete')
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

  // Jumps the phone tab switcher to Enter Score the moment a leg starts
  // (started flips false -> true) - covers onStartMatch() and every
  // startNextLeg() after the first. Doesn't fight a manual tab tap once
  // that leg is underway, since this only fires on the transition itself.
  watch(started, (isStarted) => {
    if (isStarted) activeTab.value = 'enter'
  })

  // currentPlayer is otherwise only ever set explicitly, from
  // onStartMatch()/startNextLeg() - which never run when RESUMING a game
  // that's already In Progress (as opposed to freshly starting one), so it
  // stayed null and EnterScorePanel's submit()/noScore() silently no-op.
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

  /* Grid placement for each panel - desktop/laptop (1025px+) */
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

  /* Tab strip only exists for the phone tier below 600px - hidden here so
     it never affects desktop/tablet layout or spacing. */
  .tab-strip {
    display: none;
  }

  /* Tablet (601-1024px): not enough width for the 2fr/1fr grid to stay
     comfortable, but still enough to show every panel at once (unlike
     phone) - collapse to a single reordered column instead of tabbing. */
  @media (max-width: 1024px) {
    .match-center-grid {
      display: flex;
      flex-direction: column;
      height: auto;
      min-height: 100%;
      overflow-y: auto;
    }

    .quarter {
      height: auto;
      min-height: 20rem;
    }

      .quarter > * {
        height: auto;
        min-height: 20rem;
      }

    /* Remaining Score and Enter Score are what's actually used while a leg
       is live - put them first, ahead of the Ledger/Stats reference panels. */
    .remaining-score { order: 1; }
    .enter-score { order: 2; }
    .score-ledger { order: 3; }
    .stats { order: 4; }
  }

  /* Phone (<=600px, matches MenuBar.vue's existing breakpoint): four
     panels can't all be usable at once, so show one at a time via tabs -
     defaulting to whichever panel actually matters right now (see
     activeTab in the script). All four panels stay mounted (display:none,
     not v-if) so nothing here changes what the desktop e2e suite finds. */
  @media (max-width: 600px) {
    .match-center-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      gap: 0.5rem;
    }

    .tab-strip {
      display: flex;
      flex: none;
      gap: 0.4rem;
    }

    .tab-btn {
      flex: 1 1 0;
      padding: 0.6rem 0.4rem;
      font-size: 0.85rem;
      font-weight: 600;
      text-align: center;
      color: #7f8c8d;
      background: #f0f2f4;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

      .tab-btn.active {
        color: #fff;
        background: #2c3e50;
      }

    .quarter {
      display: none;
    }

    .tab-ledger .score-ledger,
    .tab-remaining .remaining-score,
    .tab-enter .enter-score,
    .tab-stats .stats {
      display: flex;
      flex: 1 1 auto;
      min-height: 0;
      height: auto;
    }
  }
</style>
