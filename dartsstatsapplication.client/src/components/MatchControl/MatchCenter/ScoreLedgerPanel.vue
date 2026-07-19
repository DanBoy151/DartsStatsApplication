<template>
  <div class="score-ledger-panel" ref="ledgerPanel">
    <div v-if="rows.length === 0" class="ledger-empty">No throws yet</div>
    <div v-else class="ledger-timeline">
      <div v-for="(row, index) in rows"
           :key="index"
           class="ledger-row"
           :class="{ 'is-max': row.isMaximum, 'is-noscore': row.isNoScore }">
        <span class="ledger-dot" :style="{ background: playerColor(row.playerIndex) }"></span>
        <span class="ledger-player">{{ getPlayerName(row.playerId) }}</span>
        <span class="ledger-score">{{ row.isNoScore ? 'No score' : row.score }}</span>
        <span class="ledger-remaining">{{ row.isNoScore ? 'no change' : `→ ${row.remaining}` }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, nextTick } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { buildLedgerRows, startingScoreForGameType } from '@/models/gameProgress'

  const matchDataStore = useMatchDataStore()
  const ledgerPanel = ref<HTMLDivElement | null>(null)

  // Stable per-player identity colour, keyed by the player's position in the
  // game's player order (not a ranking) - reuses the app's existing accent
  // blue for the first player rather than inventing an unrelated hue.
  const PLAYER_COLORS = ['#3498db', '#8e44ad', '#16a085']

  function playerColor(playerIndex: number): string {
    return PLAYER_COLORS[playerIndex] ?? '#95a5a6'
  }

  const rows = computed(() => {
    const leg = matchDataStore.getSelectedLeg()
    const game = matchDataStore.getSelectedGame()
    if (!leg || !game) return []

    return buildLedgerRows(leg.score, startingScoreForGameType(game.type), game.players)
  })

  function getPlayerName(playerId: string): string {
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId)
    return player ? player.name : playerId
  }

  // Auto-scroll to the last row when rows change
  watch(rows, async () => {
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
    padding: 0.6rem;
    overflow-y: auto;
  }

  .ledger-empty {
    margin: auto;
    color: #95a5a6;
    font-size: 1.1rem;
    text-align: center;
  }

  .ledger-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ledger-row {
    display: grid;
    grid-template-columns: 0.6rem 1fr auto auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .ledger-row.is-max {
    background: #fff8ec;
    box-shadow: inset 0 0 0 2px #f39c12;
  }

  .ledger-row.is-noscore {
    background: #fdf2f1;
    box-shadow: inset 0 0 0 2px rgba(231, 76, 60, 0.5);
  }

  .ledger-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }

  .ledger-player {
    font-weight: 600;
    color: #2c3e50;
    font-size: 1rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ledger-score {
    font-weight: bold;
    font-size: 1.5rem;
    color: #2c3e50;
    text-align: right;
  }

  .ledger-row.is-max .ledger-score {
    color: #f39c12;
  }

  .ledger-row.is-noscore .ledger-score {
    color: #e74c3c;
    font-size: 1.1rem;
  }

  .ledger-remaining {
    font-size: 0.9rem;
    color: #7f8c8d;
    text-align: right;
    min-width: 3.5rem;
  }
</style>
