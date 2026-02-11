<template>
  <div class="score-ledger-panel" ref="ledgerPanel">
    <div class="score-ledger-grid">
      <div v-for="(entry, index) in scoreEntries"
           :key="index"
           class="score-ledger-row">
        <div class="cell label-cell">{{ index + 1 }}</div>
        <div class="score-value-cell">{{ entry.score }}</div>
        <div class="player-name-cell">{{ getPlayerName(entry.playerId) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, nextTick } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"

  const matchDataStore = useMatchDataStore()
  const ledgerPanel = ref<HTMLDivElement | null>(null)

  const scoreEntries = computed(() => matchDataStore.getSelectedLeg()?.score ?? [])

  function getPlayerName(playerId: string): string {
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId)
    return player ? player.name : playerId
  }

  // Auto-scroll to the last row when scoreEntries change
  watch(scoreEntries, async () => {
    await nextTick()
    if (ledgerPanel.value) {
      ledgerPanel.value.scrollTop = ledgerPanel.value.scrollHeight
    }
  })
</script>

<style scoped>
  .score-ledger-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
    padding: 0.5rem 0;
    overflow: hidden; /* Hide scrollbars on the panel itself */
  }

  .score-ledger-grid {
    flex: 1 1 0;
    min-height: 0; /* Allow shrinking for flex children */
    width: 100%;
    display: grid;
    grid-auto-rows: minmax(0, 1fr); /* Each row can shrink/grow */
    gap: 0.5rem;
    overflow-y: auto; /* Make the grid itself scrollable */
  }

  .score-ledger-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    width: 100%;
    gap: 1rem;
  }

  .cell,
  .player-name-cell,
  .score-value-cell {
    font-size: 1.5rem;
    padding: 0.75rem 1rem;
    text-align: center;
  }

  .label-cell {
    font-weight: bold;
    font-size: 1.5rem;
  }

  .player-name-cell {
    font-weight: bold;
  }

  .score-value-cell {
    text-align: right;
  }

</style>
