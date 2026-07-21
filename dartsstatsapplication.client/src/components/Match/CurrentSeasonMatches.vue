<template>
  <div class="center-content">
    <div class="current-season">
      <h2 class="form-heading">Current Season</h2>

      <div class="table-wrap">
        <div v-if="loading" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <div v-else class="scroll-x">
          <table class="data-table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Score</th>
                <th>Result</th>
                <th>Player of the Match</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="matches.length === 0">
                <td colspan="8" class="empty-row">No matches in the current season.</td>
              </tr>
              <tr v-for="match in matches" :key="match.id" class="data-row" data-testid="current-season-row">
                <td>{{ match.opponent }}</td>
                <td>{{ formatDisplayDate(match.date) }}</td>
                <td>{{ match.location }}</td>
                <td>{{ match.status }}</td>
                <td class="num-col">{{ hasScore(match) ? `${match.gamesFor} - ${match.gamesAgainst}` : '—' }}</td>
                <td :class="{ win: match.result === 'Win', loss: match.result === 'Loss' }">{{ match.result ?? '—' }}</td>
                <td>{{ match.status === 'Completed' && match.playerOfMatch ? playerName(match.playerOfMatch) : '—' }}</td>
                <td class="actions-col">
                  <button v-if="match.status === 'Completed'"
                          type="button"
                          class="link-btn"
                          @click="$emit('view-match', match.id)"
                          data-testid="current-season-view-btn">
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="button-row">
        <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="current-season-done">
          Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { getAllMatches } from '@/actions/MatchService'
  import { getSeasons } from '@/actions/SeasonService'
  import { getPlayers } from '@/actions/PlayerService'
  import { formatDisplayDate } from '@/utils/dateFormat'
  import type { Match } from '@/models/MatchModel'

  defineEmits<{
    (e: 'done'): void
    (e: 'view-match', matchId: string): void
  }>()

  const loading = ref(true)
  const matches = ref<Match[]>([])
  const playersById = ref(new Map<string, string>())

  function playerName(id: string): string {
    return playersById.value.get(id) ?? id
  }

  // Scheduled/Ready matches haven't actually played anything yet - gamesFor/
  // gamesAgainst would just be a misleading 0-0, so only show a score once
  // there's a real one to show.
  function hasScore(match: Match): boolean {
    return match.status === 'InProgress' || match.status === 'Completed'
  }

  onMounted(async () => {
    loading.value = true
    try {
      const [allMatches, seasons, players] = await Promise.all([getAllMatches(), getSeasons(), getPlayers()])

      // "Current season" isn't a single guaranteed record - a team can have
      // more than one Active season at once (e.g. concurrent leagues) - so
      // this shows matches from every currently-Active season together
      // rather than assuming exactly one.
      const activeSeasonIds = new Set(seasons.filter((s) => s.status === 'Active').map((s) => s.id))
      playersById.value = new Map(players.map((p) => [p.playerId, p.name]))

      matches.value = allMatches
        .filter((m) => m.seasonId && activeSeasonIds.has(m.seasonId))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    } finally {
      loading.value = false
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

  .current-season {
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

  .data-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 720px;
  }

  .data-table th {
    text-align: left;
    font-size: 0.85rem;
    color: #7f8c9a;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid #e1e6ea;
    white-space: nowrap;
  }

  .data-row td {
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid #eef1f3;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .data-row td.num-col {
    font-variant-numeric: tabular-nums;
  }

  .data-row td.win {
    color: #1e6b45;
    font-weight: 600;
  }

  .data-row td.loss {
    color: #ab2e26;
    font-weight: 600;
  }

  .actions-col {
    text-align: right;
    white-space: nowrap;
  }

  .empty-row {
    text-align: center;
    color: #7f8c9a;
    padding: 1.5rem 0;
  }

  .link-btn {
    background: none;
    border: none;
    color: #3498db;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem 0.4rem;
  }

    .link-btn:hover {
      text-decoration: underline;
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
