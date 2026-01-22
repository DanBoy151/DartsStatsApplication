<template>
  <div class="match-center-grid">
    <div class="quarter score-ledger" :class="{ disabled: !started }">
      <ScoreLedgerPanel :disabled="!started" />
    </div>
    <div class="quarter remaining-score">
      <RemainingScorePanel @start-match="onStartMatch"
                           @back-match="$emit('back')"
                           @finish-match="onFinishMatch"
                           :game-type="selectedGame?.type"
                           :gamestarted="started"/>
    </div>
    <div class="quarter enter-score" :class="{ disabled: !started }">
      <EnterScorePanel :disabled="!started" />
    </div>
    <div class="quarter stats" :class="{ disabled: !started }">
      <StatsPanel :disabled="!started" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { defineProps, defineEmits } from 'vue'
  import ScoreLedgerPanel from './MatchCenter/ScoreLedgerPanel.vue'
  import RemainingScorePanel from './MatchCenter/RemainingScorePanel.vue'
  import StatsPanel from './MatchCenter/StatsPanel.vue'
  import EnterScorePanel from './MatchCenter/EnterScorePanel.vue'

  interface Game {
    id: string
    players: string[]
    type: string
    status: string
    result: string
  }

  interface Leg {
    id: string
    gameId: string
    status: string
    score: Record<string, number>
    result: string
    finishDarts: number
    order: number
    remainingScore: number
  }

  const legs = ref<Leg[]>([])
  const emit = defineEmits(['back', 'refreshGamePanel'])

  const props = defineProps<{
    game: Game
  }>()

  const selectedGame = props.game

  const started = ref(false)
  const wonBull = ref<boolean | null>(null)

  watch(
    () => selectedGame.status,
    (newStatus) => {
      started.value = newStatus === 'InProgress'
    },
    { immediate: true }
  )

  async function onFinishMatch() {

  }

  async function onStartMatch(payload: { wonBull: boolean }) {
    started.value = true
    wonBull.value = payload.wonBull
    try {
      const response = await fetch(`http://localhost:5001/api/Game/${selectedGame.id}/start?wonBull=${wonBull.value}`, { method: 'PUT'})
      if (!response.ok) {
        // Handle error (e.g., show notification)
        console.error('Failed to start game:', await response.text())
      } else {
        // Optionally handle success (e.g., update local game state)
        const game = await response.json()
        // ... use game as needed
      }
    } catch (err) {
      console.error('Error calling start API:', err)
    }

    fetchLegs()
    emit('refreshGamePanel')
  }

  //fetch leg information from server via gameID & then add to the store for later use
  async function fetchLegs() {
    try {
      const response = await fetch(`http://localhost:5001/api/Game/${selectedGame.id}/legs`)
      if (!response.ok) throw new Error('Failed to fetch legs')
      const data = await response.json()
      legs.value = data.map((g: any) => ({
        id: g.id,
        gameId: g.data?.playerIds || [],
        status: g.data?.status || 'Unknown',
        score: g.data?.score || {},
        result: g.data?.result || 'N/A',
        finishDarts: g.data?.finishDarts || 0,
        order: g.data?.order || 0,
        remainingScore: g.data?.remainingScore || 0,
      })) || []
    }
    catch (err) {
      console.error('Error calling start API:', err)
    }
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

  /* Grid placement for each panel */
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
</style>
