<template>
  <div class="center-content">
    <div class="team-statistics">
      <h2 class="form-heading">Team Statistics</h2>

      <div class="table-wrap">
        <div v-if="loading" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <div v-else class="scroll-x">
          <table class="stats-table">
            <thead>
              <tr>
                <th class="rank-col"></th>
                <th class="name-col">Player</th>
                <th>Legs</th>
                <th>W-L</th>
                <th>Win%</th>
                <th class="headline-col">3DA</th>
                <th>First 9</th>
                <th>100+</th>
                <th>140+</th>
                <th>180s</th>
                <th>High Out</th>
                <th>Best Leg</th>
                <th>Checkout%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="stats.length === 0">
                <td colspan="13" class="empty-row">No stats yet.</td>
              </tr>
              <tr v-for="(player, index) in stats"
                  :key="player.playerId"
                  class="data-row"
                  :class="{ leader: index === 0 && hasAnyLegs }"
                  data-testid="stats-row">
                <td class="rank-col">{{ index + 1 }}</td>
                <td class="name-col">{{ player.name }}</td>
                <td>{{ player.legsPlayed }}</td>
                <td>{{ player.legsWon }}-{{ player.legsLost }}</td>
                <td>{{ formatPercent(player.winPercentage) }}</td>
                <td class="headline-col">{{ formatDecimal(player.threeDartAverage) }}</td>
                <td>{{ formatDecimal(player.firstNineAverage) }}</td>
                <td>{{ player.tons }}</td>
                <td>{{ player.ton40s }}</td>
                <td>{{ player.maximums }}</td>
                <td>{{ formatInt(player.highestCheckout) }}</td>
                <td>{{ formatInt(player.bestLegDarts) }}</td>
                <td class="na-col">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="table-note">Checkout% isn't tracked yet - the app only records the throw that finished a leg, not the missed doubles along the way.</p>

      <div class="button-row">
        <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="team-statistics-done">
          Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { getPlayerStats } from '@/actions/PlayerService'
  import type { PlayerStats } from '@/models/PlayerStatsModel'

  defineEmits<{
    (e: 'done'): void
  }>()

  const stats = ref<PlayerStats[]>([])
  const loading = ref(true)

  // Only highlight a "leader" once someone's actually played - otherwise every
  // player sits at a tied, meaningless null average and row 1 is arbitrary.
  const hasAnyLegs = computed(() => stats.value.some((p) => p.legsPlayed > 0))

  function formatDecimal(value: number | null): string {
    return value === null ? '—' : value.toFixed(1)
  }

  function formatInt(value: number | null): string {
    return value === null ? '—' : String(value)
  }

  function formatPercent(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)}%`
  }

  onMounted(async () => {
    loading.value = true
    stats.value = await getPlayerStats()
    loading.value = false
  })
</script>

<style scoped>
  .center-content {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 60vh;
    width: 100%;
    padding: 2rem 0;
  }

  .team-statistics {
    width: 960px;
    max-width: 94vw;
    padding: 2rem;
    padding-bottom: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
  }

  .form-heading {
    font-size: 1.4rem;
    font-weight: bold;
    margin: 0 0 1.5rem 0;
    color: #2c3e50;
    text-align: center;
  }

  .table-wrap {
    min-height: 4rem;
  }

  .loading-indicator {
    display: flex;
    justify-content: center;
    padding: 1.5rem 0;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 5px solid #2c3e50;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .scroll-x {
    overflow-x: auto;
  }

  .stats-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 760px;
  }

  .stats-table th {
    text-align: right;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #7f8c9a;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid #e1e6ea;
    white-space: nowrap;
  }

  .stats-table th.name-col,
  .stats-table th.rank-col {
    text-align: left;
  }

  .stats-table th.headline-col {
    color: #3498db;
  }

  .data-row td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid #eef1f3;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .data-row td.rank-col,
  .data-row td.name-col {
    text-align: left;
    font-variant-numeric: normal;
  }

  .data-row td.rank-col {
    color: #7f8c9a;
    font-weight: 600;
  }

  .data-row td.name-col {
    color: #2c3e50;
    font-weight: 600;
  }

  .data-row td.headline-col {
    color: #3498db;
    font-weight: 700;
  }

  .data-row td.na-col {
    color: #bcc4cc;
    font-style: italic;
  }

  .data-row.leader {
    background: #eaf6fb;
  }

    .data-row.leader td.rank-col {
      color: #3498db;
    }

  .empty-row {
    text-align: center;
    color: #7f8c9a;
    padding: 1.5rem 0;
  }

  .table-note {
    color: #7f8c9a;
    font-size: 0.85rem;
    margin: 1.25rem 0 0;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .control-btn {
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    background: #2c3e50;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
  }

  .back-btn {
    background: #888;
    color: #fff;
  }

    .back-btn:hover {
      background: #555;
    }
</style>
