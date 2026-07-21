<template>
  <div class="center-content">
    <div class="player-statistics">
      <h2 class="form-heading">Player Statistics</h2>

      <label class="field player-field">
        <span class="field-label">Player</span>
        <select v-model="selectedPlayerId" class="field-input" data-testid="player-statistics-player-select">
          <option value="">Select a Player</option>
          <option v-for="player in players" :key="player.playerId" :value="player.playerId">{{ player.name }}</option>
        </select>
      </label>

      <div v-if="!selectedPlayerId" class="empty-state">Pick a player to see their stats.</div>

      <template v-else>
        <div v-if="loadingPlayer" class="loading-indicator">
          <span class="spinner"></span>
        </div>

        <template v-else>
          <div class="form-panel" data-testid="player-statistics-form-panel">
            <h3 class="section-heading">Current Form <span class="form-subtitle">(last {{ form?.recentGames.length ?? 0 }} Singles games)</span></h3>

            <div v-if="!form || form.recentGames.length === 0" class="empty-state">Not enough Singles games played yet.</div>
            <div v-else class="form-content">
              <div class="form-games">
                <div v-for="game in form.recentGames" :key="game.gameId" class="form-game" :class="game.result === 'Win' ? 'is-win' : 'is-loss'">
                  <span class="form-game-date">{{ formatDisplayDate(game.date) }}</span>
                  <span class="form-game-opponent">{{ game.opponent }}</span>
                  <span class="form-game-result">{{ game.result || 'N/A' }}</span>
                  <span class="form-game-average">{{ formatDecimal(game.average) }}</span>
                </div>
              </div>

              <div class="form-summary">
                <div class="form-summary-item">
                  <span class="form-summary-label">Recent Average</span>
                  <span class="form-summary-value">{{ formatDecimal(form.recentAverage) }}</span>
                </div>
                <div class="form-summary-item">
                  <span class="form-summary-label">Career Average</span>
                  <span class="form-summary-value">{{ formatDecimal(form.careerAverage) }}</span>
                </div>
                <div class="form-summary-item">
                  <span class="form-summary-label">Trend</span>
                  <span class="trend-badge" :class="trendClass(form.trend)" data-testid="player-statistics-trend">{{ trendLabel(form.trend) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-for="section in sections" :key="section.key" class="stat-section" :data-testid="`player-statistics-section-${section.key}`">
            <div class="section-header">
              <h3 class="section-heading">{{ section.label }}</h3>
              <label class="field season-field">
                <span class="field-label">Season</span>
                <select v-model="section.seasonId" class="field-input" :data-testid="`player-statistics-season-${section.key}`" @change="loadSection(section)">
                  <option value="">All Seasons</option>
                  <option v-for="season in seasons" :key="season.id" :value="season.id">{{ season.name }} ({{ season.status }})</option>
                </select>
              </label>
            </div>

            <div v-if="section.loading" class="loading-indicator">
              <span class="spinner"></span>
            </div>
            <div v-else-if="!section.stats || section.stats.legsPlayed === 0" class="empty-state">No legs played{{ section.gameType ? ` in ${section.gameType}` : '' }}{{ section.seasonId ? ' this season' : '' }}.</div>
            <div v-else class="stat-grid">
              <div class="stat-tile"><span class="stat-label">Legs</span><span class="stat-value">{{ section.stats.legsPlayed }}</span></div>
              <div class="stat-tile"><span class="stat-label">W-L</span><span class="stat-value">{{ section.stats.legsWon }}-{{ section.stats.legsLost }}</span></div>
              <div class="stat-tile"><span class="stat-label">Win%</span><span class="stat-value">{{ formatPercent(section.stats.winPercentage) }}</span></div>
              <div class="stat-tile headline"><span class="stat-label">3DA</span><span class="stat-value">{{ formatDecimal(section.stats.threeDartAverage) }}</span></div>
              <div class="stat-tile"><span class="stat-label">First 9</span><span class="stat-value">{{ formatDecimal(section.stats.firstNineAverage) }}</span></div>
              <div class="stat-tile"><span class="stat-label">100+</span><span class="stat-value">{{ section.stats.tons }}</span></div>
              <div class="stat-tile"><span class="stat-label">140+</span><span class="stat-value">{{ section.stats.ton40s }}</span></div>
              <div class="stat-tile"><span class="stat-label">180s</span><span class="stat-value">{{ section.stats.maximums }}</span></div>
              <div class="stat-tile"><span class="stat-label">High Out</span><span class="stat-value">{{ formatInt(section.stats.highestCheckout) }}</span></div>
              <div class="stat-tile"><span class="stat-label">Best Leg</span><span class="stat-value">{{ formatInt(section.stats.bestLegDarts) }}</span></div>
            </div>
          </div>
        </template>
      </template>

      <div class="button-row">
        <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="player-statistics-done">
          Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { getPlayers, getPlayerDetailStats, getPlayerSeasons, getPlayerForm } from '@/actions/PlayerService'
  import { formatDisplayDate } from '@/utils/dateFormat'
  import type { Player } from '@/models/PlayerModel'
  import type { PlayerStats } from '@/models/PlayerStatsModel'
  import type { Season } from '@/models/SeasonModel'
  import type { PlayerForm } from '@/models/PlayerFormModel'

  const props = defineProps<{
    /** Pre-selects a player when arriving from Team Statistics; left blank when reached from the menu. */
    initialPlayerId?: string
  }>()

  defineEmits<{
    (e: 'done'): void
  }>()

  interface Section {
    key: string
    label: string
    gameType?: 'Singles' | 'Doubles' | 'Trebles'
    seasonId: string
    stats: PlayerStats | null
    loading: boolean
  }

  function freshSections(): Section[] {
    return [
      { key: 'overall', label: 'Overall', gameType: undefined, seasonId: '', stats: null, loading: false },
      { key: 'singles', label: 'Singles', gameType: 'Singles', seasonId: '', stats: null, loading: false },
      { key: 'doubles', label: 'Doubles', gameType: 'Doubles', seasonId: '', stats: null, loading: false },
      { key: 'trebles', label: 'Trebles', gameType: 'Trebles', seasonId: '', stats: null, loading: false },
    ]
  }

  const players = ref<Player[]>([])
  const selectedPlayerId = ref(props.initialPlayerId ?? '')
  const loadingPlayer = ref(false)
  const seasons = ref<Season[]>([])
  const form = ref<PlayerForm | null>(null)
  const sections = ref<Section[]>(freshSections())

  function formatDecimal(value: number | null): string {
    return value === null ? '—' : value.toFixed(1)
  }

  function formatInt(value: number | null): string {
    return value === null ? '—' : String(value)
  }

  function formatPercent(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)}%`
  }

  function trendLabel(trend: PlayerForm['trend']): string {
    switch (trend) {
      case 'Increasing': return '▲ Increasing'
      case 'Decreasing': return '▼ Decreasing'
      case 'Steady': return '— Steady'
      default: return 'Not enough data'
    }
  }

  function trendClass(trend: PlayerForm['trend']): string {
    switch (trend) {
      case 'Increasing': return 'trend-up'
      case 'Decreasing': return 'trend-down'
      case 'Steady': return 'trend-steady'
      default: return 'trend-unknown'
    }
  }

  // Each section fetches independently - changing one section's season
  // filter must not touch the other three.
  async function loadSection(section: Section) {
    if (!selectedPlayerId.value) return
    section.loading = true
    section.stats = await getPlayerDetailStats(selectedPlayerId.value, section.seasonId || undefined, section.gameType)
    section.loading = false
  }

  async function loadPlayer(playerId: string) {
    if (!playerId) {
      seasons.value = []
      form.value = null
      sections.value = freshSections()
      return
    }

    loadingPlayer.value = true
    sections.value = freshSections()

    const [seasonList, formData] = await Promise.all([getPlayerSeasons(playerId), getPlayerForm(playerId)])
    seasons.value = seasonList
    form.value = formData

    await Promise.all(sections.value.map((section) => loadSection(section)))
    loadingPlayer.value = false
  }

  watch(selectedPlayerId, (playerId) => {
    loadPlayer(playerId)
  })

  onMounted(async () => {
    players.value = await getPlayers()
    if (selectedPlayerId.value) {
      await loadPlayer(selectedPlayerId.value)
    }
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

  .player-statistics {
    width: 760px;
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .player-field {
    max-width: 360px;
    margin: 0 auto 1.5rem;
  }

  .field-label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }

  .field-input {
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
    background: #fff;
  }

  .field-input:focus {
    outline: none;
    border-color: #3498db;
  }

  .empty-state {
    text-align: center;
    color: #7f8c9a;
    padding: 1.5rem 0;
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

  .section-heading {
    font-size: 1.05rem;
    font-weight: bold;
    color: #2c3e50;
    margin: 0;
  }

  .form-subtitle {
    font-weight: 500;
    font-size: 0.85rem;
    color: #7f8c9a;
  }

  .form-panel {
    border: 1px solid #e1e6ea;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .form-content {
    margin-top: 1rem;
  }

  .form-games {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .form-game {
    display: grid;
    grid-template-columns: 7rem 1fr 4rem 4rem;
    gap: 0.75rem;
    align-items: center;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    background: #f8f9fa;
    font-size: 0.9rem;
  }

  .form-game.is-win {
    border-left: 3px solid #1f8a4c;
  }

  .form-game.is-loss {
    border-left: 3px solid #c0392b;
  }

  .form-game-date {
    color: #7f8c9a;
    font-size: 0.82rem;
  }

  .form-game-opponent {
    color: #2c3e50;
    font-weight: 600;
  }

  .form-game-result {
    text-align: right;
  }

  .form-game-average {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: #3498db;
  }

  .form-summary {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .form-summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .form-summary-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #7f8c9a;
  }

  .form-summary-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: #2c3e50;
    font-variant-numeric: tabular-nums;
  }

  .trend-badge {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 700;
    width: fit-content;
  }

  .trend-badge.trend-up {
    background: #e6f6ec;
    color: #1f8a4c;
  }

  .trend-badge.trend-down {
    background: #fbeaea;
    color: #c0392b;
  }

  .trend-badge.trend-steady {
    background: #eef1f3;
    color: #556270;
  }

  .trend-badge.trend-unknown {
    background: #eef1f3;
    color: #7f8c9a;
  }

  .stat-section {
    border: 1px solid #e1e6ea;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .season-field {
    min-width: 180px;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
  }

  .stat-tile {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.6rem;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .stat-tile.headline {
    background: #eaf6fb;
  }

  .stat-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #7f8c9a;
  }

  .stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    color: #2c3e50;
    font-variant-numeric: tabular-nums;
  }

  .stat-tile.headline .stat-value {
    color: #3498db;
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
