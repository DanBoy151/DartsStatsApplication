<template>
  <details class="stats-panel panel" open>
    <summary>
      Stats
      <span class="marker" aria-hidden="true">▶</span>
    </summary>
    <div class="panel-body">
      <div class="stat-block">
        <div class="stat-eyebrow">Average</div>
        <div class="stat-hero">{{ formatAverage(visitStats.average) }}</div>
        <div class="stat-secondary">
          <span>Highest <b>{{ visitStats.highest }}</b></span>
          <span>Visits <b>{{ visitStats.visits }}</b></span>
        </div>
        <div class="stat-tiers">
          <span>100+ <b>{{ visitStats.tier100 }}</b></span>
          <span>140+ <b>{{ visitStats.tier140 }}</b></span>
          <span>180s <b>{{ visitStats.tier180 }}</b></span>
        </div>

        <div v-if="showPlayerBreakdown" class="player-averages">
          <div class="stat-eyebrow">Player averages</div>
          <div v-for="p in playerAverages" :key="p.playerId" class="player-avg-row">
            <span class="dot" :style="{ background: playerColor(p.playerIndex) }"></span>
            <span class="name">{{ getPlayerName(p.playerId) }}</span>
            <span class="avg">{{ formatAverage(p.average) }}</span>
          </div>
        </div>

        <div v-else class="leg-averages">
          <div class="stat-eyebrow">Leg averages</div>
          <div v-for="leg in legAverages" :key="leg.order" class="leg-avg-row">
            <span class="leg-no">Leg {{ leg.order + 1 }}</span>
            <span class="leg-avg" :class="{ dim: leg.average === null }">{{ formatAverage(leg.average) }}</span>
            <span class="leg-result" :class="leg.result">{{ resultBadge(leg.result) }}</span>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import {
    computeVisitStats,
    computePlayerAverages,
    computeLegAverages,
    padLegAverages,
    totalLegsForGameType,
    type LegAverage,
  } from '@/models/gameProgress'
  import { playerColor } from '@/models/playerColors'

  const matchDataStore = useMatchDataStore()

  // Doubles/Trebles are always exactly one leg (a shared, alternating-turns
  // total) - the player split is what a single combined average can't show.
  // Singles is best-of-three with one player - the leg-by-leg split is what
  // matters there instead, and it's what says where in the best-of-three you
  // are now that there's no separate leg counter doing that job.
  const showPlayerBreakdown = computed(() => {
    const game = matchDataStore.getSelectedGame()
    if (!game) return false
    const totalLegs = game.legsToPlay > 0 ? game.legsToPlay : totalLegsForGameType(game.type)
    return totalLegs === 1
  })

  const visitStats = computed(() => computeVisitStats(matchDataStore.getSelectedLeg()?.score ?? []))

  const playerAverages = computed(() => {
    const game = matchDataStore.getSelectedGame()
    if (!game) return []
    return computePlayerAverages(matchDataStore.getSelectedLeg()?.score ?? [], game.players)
  })

  const legAverages = computed(() => {
    const game = matchDataStore.getSelectedGame()
    if (!game) return []
    return padLegAverages(computeLegAverages(game.legs), game.type, game.legsToPlay)
  })

  function getPlayerName(playerId: string): string {
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId)
    return player ? player.name : playerId
  }

  function formatAverage(avg: number | null): string {
    return avg === null ? '—' : avg.toFixed(1)
  }

  function resultBadge(result: LegAverage['result']): string {
    switch (result) {
      case 'won': return 'W'
      case 'lost': return 'L'
      case 'live': return '•'
      default: return ''
    }
  }
</script>

<style scoped>
  /* Now a sibling of ScoreLedgerPanel.vue in MatchCenter.vue's flex-wrap
     secondary row rather than a fixed grid quarter - top-level card
     language (matches ScoringConsole's own radius/shadow), and cqw sizing
     keyed off this card's own width (container-type below) rather than the
     viewport, since it can land at very different widths once flex-wrap
     reflows the row. */
  .panel {
    container-type: inline-size;
    flex: 1 1 380px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
    overflow: hidden;
  }

  .panel > summary {
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: #2c3e50;
    cursor: pointer;
    user-select: none;
  }

  .panel > summary::-webkit-details-marker {
    display: none;
  }

  .panel > summary .marker {
    color: #7f8c9a;
    font-size: 0.75rem;
    transition: transform 0.15s;
  }

  .panel[open] > summary .marker {
    transform: rotate(90deg);
  }

  .panel-body {
    padding: 0 1.25rem 1.25rem;
    max-height: 22rem;
    overflow-y: auto;
  }

  .stat-block {
    text-align: left;
  }

  .stat-eyebrow {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #7f8c8d;
    margin-bottom: 0.2rem;
  }

  .stat-hero {
    font-size: clamp(1.6rem, 9cqw, 2.4rem);
    font-weight: bold;
    color: #2c3e50;
    line-height: 1;
    margin-bottom: 0.6rem;
  }

  .stat-secondary {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: #7f8c8d;
  }

  .stat-secondary b {
    color: #2c3e50;
  }

  .stat-tiers {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px dashed #e0e3e6;
    font-size: 0.82rem;
    color: #7f8c8d;
  }

  .stat-tiers b {
    color: #2c3e50;
  }

  .player-averages,
  .leg-averages {
    margin-top: 0.7rem;
    padding-top: 0.6rem;
    border-top: 1px solid #e0e3e6;
  }

  .player-avg-row,
  .leg-avg-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.88rem;
    padding: 0.25rem 0;
  }

  .player-avg-row .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }

  .player-avg-row .name,
  .leg-avg-row .leg-no {
    flex: 1;
    color: #2c3e50;
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-avg-row .avg,
  .leg-avg-row .leg-avg {
    font-weight: 700;
    color: #2c3e50;
  }

  .leg-avg-row .leg-avg.dim {
    color: #95a5a6;
    font-weight: 400;
  }

  .leg-avg-row .leg-result {
    font-size: 0.68rem;
    font-weight: 700;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .leg-avg-row .leg-result.won {
    background: #2ecc71;
  }

  .leg-avg-row .leg-result.lost {
    background: #e74c3c;
  }

  .leg-avg-row .leg-result.live {
    background: none;
    border: 1.5px solid #f39c12;
    color: #f39c12;
  }

  .leg-avg-row .leg-result.pending {
    background: none;
    border: 1.5px dashed #d8dccf;
  }
</style>
