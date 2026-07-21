<template>
  <div class="report-page">
    <div class="toolbar no-print">
      <button type="button" class="back-btn" @click="$emit('done')" data-testid="match-report-back">&larr; Back to Matches</button>
      <button type="button"
              class="download-btn"
              :disabled="!ready"
              @click="downloadPdf"
              data-testid="match-report-download">
        Download PDF
      </button>
    </div>

    <div v-if="loading" class="status-msg no-print">Loading match report&hellip;</div>
    <div v-else-if="!match" class="status-msg error no-print">Couldn't load this match.</div>

    <div v-else class="sheet">
      <div class="masthead">
        <div class="masthead-top">
          <div class="masthead-kicker">Match Report</div>
          <div class="masthead-date">{{ formatDisplayDate(match.date) }}</div>
        </div>
        <div class="scoreline">
          <div class="team home">
            <div class="team-tag">Home</div>
            <div class="team-name">{{ homeTeamName }}</div>
          </div>
          <div class="score-box">
            <span class="num" :class="{ win: homeScore > awayScore }">{{ homeScore }}</span>
            <span class="sep">&ndash;</span>
            <span class="num" :class="{ win: awayScore > homeScore }">{{ awayScore }}</span>
          </div>
          <div class="team away">
            <div class="team-tag">Away</div>
            <div class="team-name">{{ awayTeamName }}</div>
          </div>
        </div>
      </div>

      <div class="section" v-for="section in sections" :key="section.type">
        <div class="section-head">
          <h2>{{ section.type }}</h2>
          <div class="rule"></div>
          <div class="count">{{ section.games.length }} GAME{{ section.games.length === 1 ? '' : 'S' }}</div>
        </div>
        <div class="games">
          <div class="game" v-for="(game, gi) in section.games" :key="game.id">
            <div class="game-head">
              <div class="game-label">{{ section.type.toUpperCase() }} {{ gi + 1 }}</div>
              <div class="game-players">{{ game.playerNames.join(' & ') }}</div>
              <div class="bull-chip" :class="{ won: game.wonBull }">
                <span class="dot"></span>{{ game.wonBull ? 'WON BULL' : 'LOST BULL' }}
              </div>
              <div class="result-chip" :class="game.result === 'Win' ? 'win' : 'loss'">
                {{ game.result === 'Win' ? 'WIN' : 'LOSS' }}
              </div>
            </div>
            <div class="legs">
              <div class="leg" v-for="(leg, li) in game.legs" :key="leg.legId">
                <div class="leg-head">
                  <span class="leg-title">Leg {{ li + 1 }}</span>
                  <span class="leg-outcome" :class="leg.result === 'Win' ? 'win' : 'loss'">
                    {{ leg.result === 'Win' ? 'WIN' : 'LOSS' }}
                  </span>
                  <span class="leg-finish" :class="{ bull: leg.wonByBullOff }">{{ leg.finishCaption }}</span>
                </div>
                <table class="ledger">
                  <thead>
                    <tr>
                      <th></th>
                      <th v-for="(col, ci) in leg.columns" :key="ci">{{ col.label }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pRow in leg.playerRows" :key="pRow.playerId">
                      <td class="player-label">{{ pRow.name }}</td>
                      <td v-for="(col, ci) in leg.columns" :key="ci" :class="{ omit: col.omit }">
                        {{ col.omit ? '…' : (pRow.scores[col.roundIndex] ?? '—') }}
                      </td>
                    </tr>
                    <tr class="rem-row">
                      <td>Rem</td>
                      <td v-for="(col, ci) in leg.columns"
                          :key="ci"
                          :class="{ omit: col.omit, 'final-cell': ci === leg.columns.length - 1, win: ci === leg.columns.length - 1 && leg.result === 'Win' }">
                        {{ col.omit ? '…' : (leg.remRow[col.roundIndex] ?? '') }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sheet-footer">
        <span>{{ homeTeamName }} vs {{ awayTeamName }} &middot; Darts Stats Application</span>
        <span>Exported {{ formatDisplayDate(new Date()) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { getMatch, getGamesForMatch } from '@/actions/MatchService'
  import { getLegsForGame } from '@/actions/GameService'
  import { getPlayers } from '@/actions/PlayerService'
  import { getSeasons } from '@/actions/SeasonService'
  import { getTeams } from '@/actions/TeamService'
  import { formatDisplayDate, toDateInputValue } from '@/utils/dateFormat'
  import { buildLedgerRows, startingScoreForGameType } from '@/models/gameProgress'
  import type { Match } from '@/models/MatchModel'
  import type { Game } from '@/models/GameModel'
  import type { Leg } from '@/models/LegModel'

  const props = defineProps<{ matchId: string }>()
  defineEmits<{ (e: 'done'): void }>()

  const loading = ref(true)
  const match = ref<Match | null>(null)
  const homeTeamName = ref('Home')
  const awayTeamName = ref('Away')
  const sections = ref<ReportSection[]>([])

  const homeScore = computed(() => (match.value?.location === 'Home' ? (match.value?.gamesFor ?? 0) : (match.value?.gamesAgainst ?? 0)))
  const awayScore = computed(() => (match.value?.location === 'Home' ? (match.value?.gamesAgainst ?? 0) : (match.value?.gamesFor ?? 0)))
  const ready = computed(() => !loading.value && !!match.value)

  interface LegColumn {
    label: string
    /** Index into playerRow.scores / remRow, or -1 for the ellipsis placeholder. */
    roundIndex: number
    omit: boolean
  }

  interface ReportLeg {
    legId: string
    result: string
    wonByBullOff: boolean
    finishCaption: string
    columns: LegColumn[]
    playerRows: { playerId: string; name: string; scores: (number | null)[] }[]
    remRow: (number | null)[]
  }

  interface ReportGame {
    id: string
    playerNames: string[]
    wonBull: boolean
    result: string
    legs: ReportLeg[]
  }

  interface ReportSection {
    type: 'Trebles' | 'Doubles' | 'Singles'
    games: ReportGame[]
  }

  // Fixed regardless of play order, per the report's own convention.
  const SECTION_ORDER: ReportSection['type'][] = ['Trebles', 'Doubles', 'Singles']

  // Long legs (most often one decided by bull-off, which runs to the game's
  // max-rounds cap) would otherwise stretch a leg's table far past what fits
  // on the page - collapse everything between the second and final round
  // behind a single ellipsis column instead.
  const ROUND_COLUMN_THRESHOLD = 7

  function buildColumns(roundCount: number): LegColumn[] {
    if (roundCount <= ROUND_COLUMN_THRESHOLD) {
      return Array.from({ length: roundCount }, (_, i) => ({ label: String(i + 1), roundIndex: i, omit: false }))
    }
    return [
      { label: '1', roundIndex: 0, omit: false },
      { label: '2', roundIndex: 1, omit: false },
      { label: '…', roundIndex: -1, omit: true },
      { label: String(roundCount), roundIndex: roundCount - 1, omit: false },
    ]
  }

  function finishCaption(leg: Leg): string {
    if (leg.wonByBullOff) return 'Decided on the bull'
    if (leg.result === 'Win') return `Checkout · ${leg.finishDarts} dart${leg.finishDarts === 1 ? '' : 's'}`
    return 'Opponent checked out'
  }

  function buildLegView(leg: Leg, game: Game, playerName: (id: string) => string): ReportLeg {
    const startingScore = game.startingScore || startingScoreForGameType(game.type)
    const throws = buildLedgerRows(leg.score, startingScore, game.players)
    const roundCount = throws.length > 0 ? Math.max(...throws.map((t) => t.round)) : 0

    const playerRows = game.players.map((playerId) => ({
      playerId,
      name: playerName(playerId),
      scores: Array.from({ length: roundCount }, () => null) as (number | null)[],
    }))
    const remRow: (number | null)[] = Array.from({ length: roundCount }, () => null)

    for (const t of throws) {
      const playerRow = playerRows.find((p) => p.playerId === t.playerId)
      if (playerRow) playerRow.scores[t.round - 1] = t.score
      remRow[t.round - 1] = t.remaining
    }

    return {
      legId: leg.legId,
      result: leg.result,
      wonByBullOff: leg.wonByBullOff,
      finishCaption: finishCaption(leg),
      columns: buildColumns(roundCount),
      playerRows,
      remRow,
    }
  }

  function slugify(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '')
  }

  function downloadPdf() {
    if (!match.value) return
    const previousTitle = document.title
    document.title = `${slugify(homeTeamName.value)}_vs_${slugify(awayTeamName.value)}_${toDateInputValue(match.value.date)}`
    window.print()
    document.title = previousTitle
  }

  onMounted(async () => {
    loading.value = true
    try {
      const fetchedMatch = await getMatch(props.matchId)
      match.value = fetchedMatch
      if (!fetchedMatch) return

      const [games, players, seasons, teams] = await Promise.all([
        getGamesForMatch(props.matchId),
        getPlayers(),
        getSeasons(),
        getTeams(),
      ])

      const playersById = new Map(players.map((p) => [p.playerId, p.name]))
      const playerName = (id: string) => playersById.get(id) ?? id

      const season = fetchedMatch.seasonId ? seasons.find((s) => s.id === fetchedMatch.seasonId) : undefined
      const team = season ? teams.find((t) => t.id === season.teamId) : undefined
      const ourTeamName = team?.name ?? (fetchedMatch.location === 'Home' ? 'Home Team' : 'Away Team')
      homeTeamName.value = fetchedMatch.location === 'Home' ? ourTeamName : fetchedMatch.opponent
      awayTeamName.value = fetchedMatch.location === 'Home' ? fetchedMatch.opponent : ourTeamName

      const legsByGame = await Promise.all(games.map((g) => getLegsForGame(g.id)))

      const reportGames: (ReportGame & { type: string; order: number })[] = games.map((game, i) => {
        const legs = [...(legsByGame[i] ?? [])].sort((a, b) => a.order - b.order)
        return {
          id: game.id,
          type: game.type,
          order: game.order,
          playerNames: game.players.map(playerName),
          wonBull: game.wonBull,
          result: game.result,
          legs: legs.map((leg) => buildLegView(leg, game, playerName)),
        }
      })

      sections.value = SECTION_ORDER
        .map((type) => ({
          type,
          games: reportGames.filter((g) => g.type === type).sort((a, b) => a.order - b.order),
        }))
        .filter((section) => section.games.length > 0)
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .report-page {
    --ink: #1c1a16;
    --ink-soft: #4a4638;
    --paper: #e9ebe1;
    --paper-raised: #f7f8f2;
    --card: #ffffff;
    --accent: #9c7326;
    --win: #1e6b45;
    --win-bg: #e3efe6;
    --loss: #ab2e26;
    --loss-bg: #f3e4e2;
    --line: #c9c4b0;
    --line-soft: #ddd9c8;
    --font-display: 'Bahnschrift', 'Segoe UI Semibold', system-ui, sans-serif;
    --font-body: 'Constantia', Georgia, 'Times New Roman', serif;
    --font-data: 'Consolas', 'SF Mono', Menlo, monospace;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px 16px 48px;
    background: var(--paper);
    min-height: 100%;
    box-sizing: border-box;
    color: var(--ink);
  }

  .toolbar {
    width: 210mm;
    max-width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .back-btn,
  .download-btn {
    padding: 0.5rem 1.25rem;
    font-size: 0.95rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .back-btn {
    background: #888;
    color: #fff;
  }
  .back-btn:hover { background: #555; }
  .download-btn {
    background: var(--accent);
    color: #fff;
  }
  .download-btn:hover:not(:disabled) { background: #83621f; }
  .download-btn:disabled { opacity: 0.6; cursor: default; }

  .status-msg {
    padding: 3rem 0;
    color: var(--ink-soft);
    font-size: 1rem;
  }
  .status-msg.error { color: var(--loss); }

  /* ---- the A4 sheet ---- */
  .sheet {
    width: 210mm;
    max-width: 100%;
    min-height: 297mm;
    background: var(--card);
    box-shadow: 0 1px 2px rgba(28, 26, 22, 0.08), 0 12px 32px rgba(28, 26, 22, 0.16);
    padding: 11mm 12mm;
    display: flex;
    flex-direction: column;
    gap: 3mm;
    box-sizing: border-box;
  }

  .masthead {
    display: flex;
    flex-direction: column;
    gap: 2.2mm;
    padding-bottom: 2.6mm;
    border-bottom: 0.9mm solid var(--accent);
  }
  .masthead-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .masthead-kicker {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 8.6px;
    color: var(--accent);
  }
  .masthead-date {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 9.5px;
    color: var(--ink-soft);
    letter-spacing: 0.04em;
  }

  .scoreline {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 5mm;
  }
  .team {
    display: flex;
    flex-direction: column;
    gap: 0.6mm;
  }
  .team.away { align-items: flex-end; text-align: right; }
  .team-tag {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 7.6px;
    color: var(--ink-soft);
  }
  .team-name {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 16.5px;
    line-height: 1.1;
    color: var(--ink);
  }
  .score-box {
    display: flex;
    align-items: baseline;
    gap: 2.4mm;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }
  .score-box .num {
    font-size: 26px;
    font-weight: 700;
    color: var(--ink);
  }
  .score-box .num.win { color: var(--win); }
  .score-box .sep { font-size: 13px; color: var(--ink-soft); }

  .section {
    display: flex;
    flex-direction: column;
    gap: 1.4mm;
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 2.5mm;
  }
  .section-head h2 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 10.5px;
    color: var(--ink);
    white-space: nowrap;
  }
  .section-head .rule {
    flex: 1;
    height: 1px;
    background: var(--line);
  }
  .section-head .count {
    font-family: var(--font-data);
    font-size: 8px;
    color: var(--ink-soft);
    white-space: nowrap;
  }

  .games {
    display: flex;
    flex-direction: column;
    gap: 1.1mm;
  }

  .game {
    border: 0.35mm solid var(--line-soft);
    border-radius: 1mm;
    overflow: hidden;
  }
  .game-head {
    display: flex;
    align-items: center;
    gap: 3mm;
    padding: 1.2mm 2.4mm;
    background: var(--paper-raised);
    border-bottom: 0.35mm solid var(--line-soft);
  }
  .game-label {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 8.4px;
    color: var(--ink-soft);
    min-width: 13mm;
  }
  .game-players {
    font-family: var(--font-body);
    font-size: 9.6px;
    color: var(--ink);
    flex: 1;
  }
  .bull-chip {
    display: inline-flex;
    align-items: center;
    gap: 1mm;
    font-family: var(--font-data);
    font-size: 7.4px;
    letter-spacing: 0.03em;
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .bull-chip .dot {
    width: 1.6mm;
    height: 1.6mm;
    border-radius: 50%;
    background: var(--line);
  }
  .bull-chip.won .dot { background: var(--accent); }
  .bull-chip.won { color: var(--accent); }

  .result-chip {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 8.2px;
    letter-spacing: 0.06em;
    padding: 0.7mm 2.2mm;
    border-radius: 0.8mm;
  }
  .result-chip.win { background: var(--win-bg); color: var(--win); }
  .result-chip.loss { background: var(--loss-bg); color: var(--loss); }

  .legs {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1mm;
    padding: 1.5mm 2.4mm 2mm;
  }

  .leg-head {
    display: flex;
    align-items: baseline;
    gap: 2mm;
    margin-bottom: 0.6mm;
  }
  .leg-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 7.6px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .leg-outcome {
    font-family: var(--font-data);
    font-size: 7.4px;
    font-weight: 700;
  }
  .leg-outcome.win { color: var(--win); }
  .leg-outcome.loss { color: var(--loss); }
  .leg-finish {
    font-family: var(--font-data);
    font-size: 6.9px;
    color: var(--ink-soft);
    margin-left: auto;
  }
  .leg-finish.bull { color: var(--accent); }

  table.ledger {
    border-collapse: collapse;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 7px;
  }
  table.ledger th,
  table.ledger td {
    padding: 0.4mm 1.1mm;
    text-align: right;
    min-width: 4.6mm;
  }
  table.ledger th {
    font-weight: 400;
    color: var(--ink-soft);
    font-size: 6.2px;
    border-bottom: 0.35mm solid var(--line-soft);
  }
  table.ledger th:first-child,
  table.ledger td:first-child {
    text-align: left;
    padding-right: 2mm;
    min-width: 0;
  }
  table.ledger td.player-label {
    font-family: var(--font-body);
    font-size: 7.3px;
    color: var(--ink);
  }
  table.ledger td.omit { color: var(--line); }
  table.ledger tr.rem-row td {
    color: var(--ink-soft);
    border-top: 0.35mm solid var(--line-soft);
  }
  table.ledger tr.rem-row td:first-child {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 6.4px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  table.ledger tr.rem-row td.final-cell { font-weight: 700; }
  table.ledger tr.rem-row td.final-cell.win { color: var(--win); }

  .sheet-footer {
    margin-top: auto;
    padding-top: 2mm;
    border-top: 0.35mm solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    font-family: var(--font-data);
    font-size: 6.8px;
    color: var(--ink-soft);
    letter-spacing: 0.03em;
  }

  @media print {
    @page { size: A4; margin: 10mm; }
    .no-print { display: none !important; }
    .report-page { padding: 0; gap: 0; background: #fff; }
    .sheet { box-shadow: none; width: auto; min-height: auto; padding: 0; }
  }
</style>
