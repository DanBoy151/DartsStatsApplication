<template>
  <div class="match-center-grid">
    <div class="quarter score-ledger"><ScoreLedgerPanel /></div>
    <div class="quarter remaining-score">
      <RemainingScorePanel @back="$emit('back')" :game-type="gameType" />
    </div>
    <div class="quarter enter-score"><EnterScorePanel /></div>
    <div class="quarter stats"><StatsPanel /></div>
  </div>
</template>

<script setup lang="ts">
  import { defineProps, defineEmits } from 'vue'
  import ScoreLedgerPanel from './MatchCenter/ScoreLedgerPanel.vue'
  import RemainingScorePanel from './MatchCenter/RemainingScorePanel.vue'
  import StatsPanel from './MatchCenter/StatsPanel.vue'
  import EnterScorePanel from './MatchCenter/EnterScorePanel.vue'

  defineEmits(['back'])

  const props = defineProps<{
    gameType: string
  }>()
  const gameType = props.gameType
</script>

<style scoped>
  .match-center-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: 1fr 2fr 2fr;
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

  /* Grid placement for each panel */
  .score-ledger {
    grid-column: 1 / 2;
    grid-row: 1 / 3; /* spans top 2/3 of left column */
  }

  .enter-score {
    grid-column: 1 / 2;
    grid-row: 3 / 4; /* bottom 1/3 of left column */
  }

  .remaining-score {
    grid-column: 2 / 3;
    grid-row: 1 / 2; /* top 1/3 of right column */
  }

  .stats {
    grid-column: 2 / 3;
    grid-row: 2 / 4; /* bottom 2/3 of right column */
  }

</style>
