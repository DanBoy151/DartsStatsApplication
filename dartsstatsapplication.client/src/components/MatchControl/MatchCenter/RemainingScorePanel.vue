<template>
  <div class="remaining-score-panel">
    <div class="remaining-score-row">
      {{ score }}
    </div>
    <div class="button-row">
      <template v-if="readonly">
        <button class="back-btn" @click="backMatch">Back</button>
      </template>
      <template v-else>
        <button v-if="!started" class="start-btn" @click="showBullPopup = true">Start</button>
        <button v-else class="finish-btn" @click="finish">Finish</button>
        <!-- Only while Ready (not yet started) - once InProgress the roster is locked in. -->
        <button v-if="!started" class="edit-players-btn" @click="editPlayers">Edit Players</button>
        <button v-if="!started" class="cancel-btn" @click="cancelMatch">Cancel</button>
        <button v-else class="back-btn" @click="backMatch">Back</button>
      </template>
    </div>
    <WonBullControl v-if="showBullPopup"
                    @result="onBullResult" />
    <DoublesFinishControl v-if="showFinishDartsPopup"
                          @result="onFinishDartsResult" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, defineEmits, defineProps } from 'vue'
  import WonBullControl from './WonBullControl.vue'
  import DoublesFinishControl from './DoublesFinishControl.vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"

  const matchDataStore = useMatchDataStore()

  const remainingScore = computed(() => matchDataStore.getSelectedLeg()?.remainingScore ?? 0)

  const emit = defineEmits(['start-match', 'finish-leg', 'back-match', 'cancel-match', 'edit-players'])
  const props = defineProps<{
    gameType: string
    disabled?: boolean
    gamestarted?: boolean
    currentLegId?: string
    currentPlayerId?: string
    /** Viewing a Complete game: show the last leg's result only, no scoring controls. */
    readonly?: boolean
  }>()


  const started = ref(!!props.gamestarted || hasMatchStarted())
  const showBullPopup = ref(false)
  const showFinishDartsPopup = ref(false)
  const wonBull = ref<boolean | null>(null)
  const score = ref<number | string>(getInitialScore())

  watch(remainingScore, (newScore) => {
    score.value = newScore
  })

  function hasMatchStarted() {
    const game = matchDataStore.getSelectedGame()
    return game?.status === 'InProgress'
  }

  // Sync started with gamestarted prop
  watch(
    () => props.gamestarted,
    (val) => {
      started.value = !!val || hasMatchStarted()
    },
    { immediate: true }
  )

  function onBullResult(result: boolean) {
    wonBull.value = result
    showBullPopup.value = false
    startMatch()
  }

  function getInitialScore() {
    const score = 0

    if (hasMatchStarted() || props.readonly) {
      return remainingScore.value
    }
    // Prefer the game's actual configured starting score (from its League,
    // or the compat-guard default written server-side) - the hardcoded
    // table below only covers today's fixed defaults, and is a fallback
    // for the rare case a game object doesn't have the field yet.
    const configured = matchDataStore.selectedGame?.startingScore
    if (configured && configured > 0) return configured

    const type = props.gameType?.toLowerCase()
    if (type === 'trebles' || type === 'treble') return 701
    if (type === 'doubles' || type === 'double') return 601
    if (type === 'singles' || type === 'single') return 501
    return score
  }

  function startMatch() {
    started.value = true
    emit('start-match', { wonBull: wonBull.value })
  }

  function cancelMatch() {
    emit('cancel-match')
  }

  function backMatch() {
    emit('back-match')
  }

  function editPlayers() {
    emit('edit-players')
  }

  /**
   * Reaching exactly 0 is a genuine checkout - same as the automatic popup
   * EnterScorePanel triggers when a throw brings the score to 0 - so ask how
   * many darts it took and record a Win. Otherwise, the leg is being ended
   * without checking out, which can only mean a Loss - complete it
   * immediately, no dart count to ask for.
   */
  function finish() {
    if (remainingScore.value === 0) {
      showFinishDartsPopup.value = true
    } else {
      matchDataStore.completeSelectedLeg('Loss', 0)
      finishLeg()
    }
  }

  function onFinishDartsResult(darts: number) {
    showFinishDartsPopup.value = false
    matchDataStore.completeSelectedLeg('Win', darts)
    finishLeg()
  }

  function finishLeg() {
    emit('finish-leg')
  }

  // Optionally, reset started if disabled becomes false again
  watch(() => props.disabled, (val) => {
    if (!val) started.value = true
  })

</script>

<style scoped>
  .remaining-score-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    /* Lets descendants size off this panel's own width (cqw below) instead
       of the viewport's - the panel's actual width varies a lot more than
       the viewport does (e.g. the narrow desktop-grid column vs. the
       near-full-width phone tab), so vw was sizing the number for the
       wrong box and it overflowed whenever the two diverged. */
    container-type: inline-size;
  }

  .leg-score-row {
    font-size: 2rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2rem;
    width: 100%;
  }

  .remaining-score-row {
    /* Scales fluidly with the panel's own width (cqw, not vw - see
       container-type above) instead of a fixed 8rem, which overflowed
       whenever this panel was narrower than the viewport implied. */
    font-size: clamp(2.25rem, 28cqw, 8rem);
    font-weight: bold;
    text-align: center;
    margin-bottom: auto;
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: auto;
  }

  /* Narrow container (the pinched desktop-grid column, or phone) - smaller
     padding/text gives two buttons a real chance to sit side by side
     before flex-wrap falls back to one per line. */
  @container (max-width: 340px) {
    .button-row button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }
  }

  @media (max-width: 600px) {
    .button-row {
      justify-content: stretch;
    }

    .button-row button {
      flex: 1 1 45%;
    }
  }

  .back-btn {
    background: #888;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .back-btn:hover {
      background: #555;
    }

  .cancel-btn {
    background: #888;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .cancel-btn:hover {
      background: #555;
    }

  .start-btn {
    background: #2c3e50;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .start-btn:hover {
      background: #506E8BFF;
    }

  .edit-players-btn {
    background: #7f8c9a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .edit-players-btn:hover {
      background: #67757f;
    }

  .finish-btn {
    background: #2c3e50;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .finish-btn:hover {
      background: #506E8BFF;
    }
</style>
