<template>
  <details class="score-ledger-panel panel" open>
    <summary>
      Score Ledger
      <span class="marker" aria-hidden="true">▶</span>
    </summary>

    <!-- Only worth showing once there's a choice - a single-leg game (most
         Doubles/Trebles) never renders this row at all. -->
    <div v-if="sortedLegs.length > 1" class="leg-tabs">
      <button v-for="(leg, index) in sortedLegs"
              :key="leg.legId"
              type="button"
              class="leg-tab"
              :class="[legTabStatusClass(leg), { active: leg.legId === viewedLegId }]"
              :data-testid="`leg-tab-${index}`"
              @click="viewedLegId = leg.legId">
        <span class="dot" aria-hidden="true"></span> Leg {{ index + 1 }}
      </button>
    </div>
    <div v-if="sortedLegs.length > 1 && !isViewingActiveLeg" class="viewing-note" data-testid="viewing-history-note">
      Viewing history — <span class="pill">read-only</span>
    </div>

    <div class="panel-body" ref="ledgerPanel">
      <div v-if="rows.length === 0" class="ledger-empty">No throws yet</div>
      <template v-else>
        <div class="ledger-timeline">
          <template v-for="(entry, displayIndex) in displayRows" :key="entry.index">
            <div v-if="entry.row.round !== displayRows[displayIndex - 1]?.row.round" class="ledger-round-divider">Round {{ entry.row.round }}</div>
            <div class="ledger-row"
                 :class="{ 'is-max': entry.row.isMaximum, 'is-noscore': entry.row.isNoScore, 'is-editing': editingIndex === entry.index }">
              <span class="ledger-dot" :style="{ background: playerColor(entry.row.playerIndex) }"></span>
              <span class="ledger-player">{{ getPlayerName(entry.row.playerId) }}</span>

              <template v-if="editingIndex === entry.index">
                <input class="ledger-score-input"
                       ref="editInputEl"
                       type="text"
                       inputmode="numeric"
                       v-model="editValue"
                       :data-testid="`ledger-edit-input-${entry.index}`"
                       @keydown.enter="saveEdit(entry.index)"
                       @keydown.escape="cancelEdit" />
                <span class="ledger-edit-actions">
                  <button type="button"
                          class="ledger-edit-btn save"
                          :data-testid="`ledger-edit-save-${entry.index}`"
                          aria-label="Save score"
                          @click="saveEdit(entry.index)">✓</button>
                  <button type="button"
                          class="ledger-edit-btn cancel"
                          :data-testid="`ledger-edit-cancel-${entry.index}`"
                          aria-label="Cancel edit"
                          @click="cancelEdit">✕</button>
                </span>
              </template>
              <template v-else>
                <button v-if="canEdit"
                        type="button"
                        class="ledger-score ledger-score-editable"
                        :data-testid="`ledger-score-${entry.index}`"
                        @click="startEdit(entry.index, entry.row.score)">{{ entry.row.isNoScore ? 'No score' : entry.row.score }}</button>
                <span v-else class="ledger-score">{{ entry.row.isNoScore ? 'No score' : entry.row.score }}</span>
                <span class="ledger-remaining">{{ entry.row.isNoScore ? 'no change' : `→ ${entry.row.remaining}` }}</span>
              </template>
            </div>
            <div v-if="editingIndex === entry.index && editError" class="ledger-edit-error">{{ editError }}</div>
          </template>
        </div>

        <div v-if="viewedLegFinalCaption" class="leg-final" :class="viewedLeg?.result === 'Win' ? 'win' : 'loss'" data-testid="leg-final-summary">
          Leg {{ viewedLegNumber }} — {{ viewedLeg?.result === 'Win' ? 'Won' : 'Lost' }} · {{ viewedLegFinalCaption }}
        </div>
      </template>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { computed, ref, watch, nextTick } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import type { LegDataState } from "@/stores/matchDataStore"
  import { buildLedgerRows, startingScoreForGameType } from '@/models/gameProgress'
  import { isValidDartScore } from '@/models/dartScoring'
  import { playerColor } from '@/models/playerColors'

  const props = defineProps<{
    /** Allow correcting a previously-recorded throw - only while the game is
     *  actually In Progress, not before it starts or once it's Complete.
     *  Even then, only the ACTIVE leg is ever editable - a historical leg
     *  viewed via the tabs below is always read-only (see canEdit). */
    editable?: boolean
  }>()

  const matchDataStore = useMatchDataStore()
  const ledgerPanel = ref<HTMLDivElement | null>(null)
  const editInputEl = ref<HTMLInputElement[]>([])

  // Prefer the game's actual configured starting score (from its League) -
  // the gameType lookup table only covers today's fixed defaults, and is a
  // fallback for a game object that somehow lacks the field.
  function resolveStartingScore(game: { type: string; startingScore: number }): number {
    return game.startingScore > 0 ? game.startingScore : startingScoreForGameType(game.type)
  }

  const sortedLegs = computed(() =>
    [...(matchDataStore.getSelectedGame()?.legs ?? [])].sort((a, b) => a.order - b.order)
  )

  const activeLegId = computed(() => matchDataStore.getSelectedLeg()?.legId ?? null)

  // Which leg the ledger is currently DISPLAYING - independent of
  // matchDataStore.selectedLeg, which drives live scoring elsewhere
  // (ScoringConsole's hero score, etc.) and must never be disturbed just by
  // looking at an earlier leg's history here.
  const viewedLegId = ref<string | null>(null)

  // Whenever the actually-active leg changes (a new leg starts, or a
  // different game is selected), snap the view back to it - a captain
  // mid-scoring should always land on "what I'm playing now" by default,
  // and only see history if they deliberately pick an older tab.
  watch(activeLegId, (id) => {
    viewedLegId.value = id
    cancelEdit()
  }, { immediate: true })

  watch(viewedLegId, () => cancelEdit())

  const viewedLeg = computed(() => {
    const leg = sortedLegs.value.find(l => l.legId === viewedLegId.value)
    return leg ?? matchDataStore.getSelectedLeg()
  })

  const isViewingActiveLeg = computed(() => viewedLegId.value === activeLegId.value)
  const canEdit = computed(() => !!props.editable && isViewingActiveLeg.value)

  function legTabStatusClass(leg: LegDataState): string {
    if (leg.status !== 'Completed') return 'live'
    return leg.result === 'Win' ? 'win' : 'loss'
  }

  const viewedLegNumber = computed(() =>
    sortedLegs.value.findIndex(l => l.legId === viewedLeg.value?.legId) + 1
  )

  const viewedLegFinalCaption = computed(() => {
    const leg = viewedLeg.value
    if (!leg || leg.status !== 'Completed') return null
    if (leg.wonByBullOff) return 'Decided on the bull'
    if (leg.result === 'Win') return `Checkout · ${leg.finishDarts} dart${leg.finishDarts === 1 ? '' : 's'}`
    return 'Opponent checked out'
  })

  const rows = computed(() => {
    const leg = viewedLeg.value
    const game = matchDataStore.getSelectedGame()
    if (!leg || !game) return []

    return buildLedgerRows(leg.score, resolveStartingScore(game), game.players)
  })

  // Newest throw first - `index` stays the row's original (chronological)
  // position, since editingIndex/startEdit/saveEdit and the ledger-score-*
  // testids all key off that same index into leg.score, independent of
  // however the rows are ordered for display.
  const displayRows = computed(() =>
    rows.value.map((row, index) => ({ row, index })).reverse()
  )

  function getPlayerName(playerId: string): string {
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId)
    return player ? player.name : playerId
  }

  const editingIndex = ref<number | null>(null)
  const editValue = ref('')
  const editError = ref('')

  async function startEdit(index: number, currentScore: number) {
    if (!canEdit.value || editingIndex.value !== null) return
    editingIndex.value = index
    editValue.value = String(currentScore)
    editError.value = ''
    await nextTick()
    const el = editInputEl.value[0]
    el?.focus()
    el?.select()
  }

  function cancelEdit() {
    editingIndex.value = null
    editValue.value = ''
    editError.value = ''
  }

  function saveEdit(index: number) {
    const num = Number(editValue.value)
    if (!editValue.value || !/^\d+$/.test(editValue.value)) {
      editError.value = 'Score must be a positive integer.'
      return
    }
    if (num < 0 || num > 180) {
      editError.value = 'Score must be between 0 and 180.'
      return
    }
    if (!isValidDartScore(num)) {
      editError.value = `${num} isn't a score that's possible with up to 3 darts.`
      return
    }

    const game = matchDataStore.getSelectedGame()
    if (!game) return
    const ok = matchDataStore.editSelectedLegScoreEntry(index, num, resolveStartingScore(game))
    if (!ok) {
      editError.value = 'That score leaves the leg below zero remaining.'
      return
    }

    cancelEdit()
  }

  // Auto-scroll to the most recent throw when rows change (including a tab
  // switch, since rows is derived from viewedLeg) - now the first row in the
  // panel, since the ledger displays newest-first.
  watch(rows, async () => {
    await nextTick()
    if (ledgerPanel.value) {
      ledgerPanel.value.scrollTop = 0
    }
  })
</script>

<style scoped>
  /* Now a sibling of StatsPanel.vue in MatchCenter.vue's flex-wrap secondary
     row rather than a fixed grid quarter - top-level card language
     (matches ScoringConsole's own radius/shadow) since it stands on its
     own now instead of nesting inside a shared grid cell. */
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

  .leg-tabs {
    display: flex;
    gap: 0.4rem;
    padding: 0 0.9rem 0.75rem;
    overflow-x: auto;
  }

  .leg-tab {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    border: 2px solid transparent;
    background: #f8f9fa;
    color: #7f8c9a;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    white-space: nowrap;
  }

    .leg-tab:hover {
      background: #eaf1f8;
    }

    .leg-tab.active {
      border-color: #3498db;
      background: #eaf1f8;
      color: #3498db;
    }

    .leg-tab .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex: none;
    }

    .leg-tab.win .dot { background: #1f8a4c; }
    .leg-tab.loss .dot { background: #e74c3c; }

    .leg-tab.live .dot {
      background: #3498db;
      animation: leg-tab-pulse 1.4s ease-in-out infinite;
    }

    .leg-tab.win.active { border-color: #1f8a4c; background: #e6f6ec; color: #1f8a4c; }
    .leg-tab.loss.active { border-color: #e74c3c; background: #fdecea; color: #e74c3c; }

  @keyframes leg-tab-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .viewing-note {
    padding: 0 1.25rem 0.6rem;
    font-size: 0.78rem;
    color: #7f8c9a;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

    .viewing-note .pill {
      display: inline-flex;
      align-items: center;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.16rem 0.55rem;
      border-radius: 999px;
      background: #f8f9fa;
      color: #7f8c9a;
    }

  .leg-final {
    margin: 0.5rem 0.4rem 0.2rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .leg-final.win {
    background: #e6f6ec;
    color: #1f8a4c;
  }

  .leg-final.loss {
    background: #fdecea;
    color: #e74c3c;
  }

  .panel-body {
    padding: 0 0.6rem 0.6rem;
    max-height: 22rem;
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

  .ledger-round-divider {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #95a5a6;
    padding: 0 0.2rem;
  }

  .ledger-round-divider:not(:first-child) {
    margin-top: 0.2rem;
    padding-top: 0.5rem;
    border-top: 1px dashed #e0e3e6;
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

  button.ledger-score {
    font-family: inherit;
  }

  .ledger-score-editable {
    background: none;
    border: none;
    padding: 0.1rem 0.4rem;
    border-radius: 6px;
    cursor: pointer;
  }

    .ledger-score-editable:hover {
      background: #eaf1f8;
      box-shadow: inset 0 0 0 1px #3498db;
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

  .ledger-row.is-editing {
    background: #eaf1f8;
    box-shadow: inset 0 0 0 2px #3498db;
  }

  .ledger-score-input {
    width: 3.5rem;
    font-size: 1.3rem;
    font-weight: bold;
    color: #2c3e50;
    text-align: right;
    border: 1px solid #3498db;
    border-radius: 6px;
    padding: 0.15rem 0.4rem;
  }

  .ledger-edit-actions {
    display: flex;
    gap: 0.3rem;
  }

  .ledger-edit-btn {
    /* 44px - a 1.7rem (27px) round tap target was a genuine mis-tap risk on
       any touchscreen, not just small ones. */
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: none;
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .ledger-edit-btn.save {
    background: #2ecc71;
    color: #fff;
  }

  .ledger-edit-btn.cancel {
    background: #e0e3e6;
    color: #2c3e50;
  }

  .ledger-edit-error {
    font-size: 0.8rem;
    color: #e74c3c;
    padding: 0 0.9rem;
    margin-top: -0.2rem;
  }
</style>
