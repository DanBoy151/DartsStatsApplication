<template>
  <div class="score-ledger-panel" ref="ledgerPanel">
    <div v-if="rows.length === 0" class="ledger-empty">No throws yet</div>
    <div v-else class="ledger-timeline">
      <template v-for="(row, index) in rows" :key="index">
        <div v-if="row.round !== rows[index - 1]?.round" class="ledger-round-divider">Round {{ row.round }}</div>
        <div class="ledger-row"
             :class="{ 'is-max': row.isMaximum, 'is-noscore': row.isNoScore, 'is-editing': editingIndex === index }">
          <span class="ledger-dot" :style="{ background: playerColor(row.playerIndex) }"></span>
          <span class="ledger-player">{{ getPlayerName(row.playerId) }}</span>

          <template v-if="editingIndex === index">
            <input class="ledger-score-input"
                   ref="editInputEl"
                   type="text"
                   inputmode="numeric"
                   v-model="editValue"
                   :data-testid="`ledger-edit-input-${index}`"
                   @keydown.enter="saveEdit(index)"
                   @keydown.escape="cancelEdit" />
            <span class="ledger-edit-actions">
              <button type="button"
                      class="ledger-edit-btn save"
                      :data-testid="`ledger-edit-save-${index}`"
                      aria-label="Save score"
                      @click="saveEdit(index)">✓</button>
              <button type="button"
                      class="ledger-edit-btn cancel"
                      :data-testid="`ledger-edit-cancel-${index}`"
                      aria-label="Cancel edit"
                      @click="cancelEdit">✕</button>
            </span>
          </template>
          <template v-else>
            <button v-if="editable"
                    type="button"
                    class="ledger-score ledger-score-editable"
                    :data-testid="`ledger-score-${index}`"
                    @click="startEdit(index, row.score)">{{ row.isNoScore ? 'No score' : row.score }}</button>
            <span v-else class="ledger-score">{{ row.isNoScore ? 'No score' : row.score }}</span>
            <span class="ledger-remaining">{{ row.isNoScore ? 'no change' : `→ ${row.remaining}` }}</span>
          </template>
        </div>
        <div v-if="editingIndex === index && editError" class="ledger-edit-error">{{ editError }}</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, nextTick } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { buildLedgerRows, startingScoreForGameType } from '@/models/gameProgress'
  import { isValidDartScore } from '@/models/dartScoring'

  const props = defineProps<{
    /** Allow correcting a previously-recorded throw - only while the game is
     *  actually In Progress, not before it starts or once it's Complete. */
    editable?: boolean
  }>()

  const matchDataStore = useMatchDataStore()
  const ledgerPanel = ref<HTMLDivElement | null>(null)
  const editInputEl = ref<HTMLInputElement[]>([])

  // Stable per-player identity colour, keyed by the player's position in the
  // game's player order (not a ranking) - reuses the app's existing accent
  // blue for the first player rather than inventing an unrelated hue.
  const PLAYER_COLORS = ['#3498db', '#8e44ad', '#16a085']

  function playerColor(playerIndex: number): string {
    return PLAYER_COLORS[playerIndex] ?? '#95a5a6'
  }

  // Prefer the game's actual configured starting score (from its League) -
  // the gameType lookup table only covers today's fixed defaults, and is a
  // fallback for a game object that somehow lacks the field.
  function resolveStartingScore(game: { type: string; startingScore: number }): number {
    return game.startingScore > 0 ? game.startingScore : startingScoreForGameType(game.type)
  }

  const rows = computed(() => {
    const leg = matchDataStore.getSelectedLeg()
    const game = matchDataStore.getSelectedGame()
    if (!leg || !game) return []

    return buildLedgerRows(leg.score, resolveStartingScore(game), game.players)
  })

  function getPlayerName(playerId: string): string {
    const player = matchDataStore.matchAvailablePlayers.find(p => p.playerId === playerId)
    return player ? player.name : playerId
  }

  const editingIndex = ref<number | null>(null)
  const editValue = ref('')
  const editError = ref('')

  async function startEdit(index: number, currentScore: number) {
    if (!props.editable || editingIndex.value !== null) return
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
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 50%;
    border: none;
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
