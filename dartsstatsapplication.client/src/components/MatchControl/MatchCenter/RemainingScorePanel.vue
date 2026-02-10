<template>
  <div class="remaining-score-panel">
    <div v-if="isSingles" class="leg-score-row">
      Leg Score: 0 - 0
    </div>
    <div class="remaining-score-row">
      {{ score }}
    </div>
    <div class="button-row">
      <button v-if="!started" class="start-btn" @click="showBullPopup = true">Start</button>
      <button v-else class="finish-btn" @click="finish">Finish</button>
      <button class="back-btn" @click="cancelMatch">Cancel</button>
    </div>
    <WonBullControl v-if="showBullPopup"
                    @result="onBullResult" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, defineEmits, defineProps } from 'vue'
  import WonBullControl from './WonBullControl.vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"

  const matchDataStore = useMatchDataStore()

  const remainingScore = computed(() => matchDataStore.getSelectedLeg()?.remainingScore ?? 0)
  
  const emit = defineEmits(['start-match', 'finish-game', 'finish-leg', 'back-match'])
  const props = defineProps<{
    gameType: string
    disabled?: boolean
    gamestarted?: boolean
    currentLegId?: string
    currentPlayerId?: string
  }>()


  const started = ref(!!props.gamestarted || hasMatchStarted())
  const showBullPopup = ref(false)
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

    if (hasMatchStarted()) {
      return remainingScore.value
    } 
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
    emit('back-match')
  }

  function finish() {
    finishLeg()
    finishMatch()
  }

  function finishMatch() {
    emit('finish-game')
  }

  function finishLeg() {
    emit('finish-leg')
  }

  // Optionally, reset started if disabled becomes false again
  watch(() => props.disabled, (val) => {
    if (!val) started.value = true
  })

  const isSingles = computed(() =>
    props.gameType?.toLowerCase() === 'singles' || props.gameType?.toLowerCase() === 'single'
  )
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
  }

  .leg-score-row {
    font-size: 2rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2rem;
    width: 100%;
  }

  .remaining-score-row {
    font-size: 8rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: auto;
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: auto;
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
