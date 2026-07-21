<template>
  <div class="center-content">
    <div class="manage-leagues">
      <h2 class="form-heading">Leagues</h2>

      <div class="table-wrap">
        <div v-if="loadingTable" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Trebles</th>
              <th>Doubles</th>
              <th>Singles</th>
              <th>Max Rounds</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="leagues.length === 0">
              <td colspan="6" class="empty-row">No leagues yet.</td>
            </tr>
            <tr v-for="league in leagues" :key="league.id" class="data-row" data-testid="league-row">
              <td>{{ league.name }}</td>
              <td>{{ league.numTrebles }} games / {{ league.treblesLegs }} legs / {{ league.treblesStartScore }}</td>
              <td>{{ league.numDoubles }} games / {{ league.doublesLegs }} legs / {{ league.doublesStartScore }}</td>
              <td>{{ league.numSingles }} games / {{ league.singlesLegs }} legs / {{ league.singlesStartScore }}</td>
              <td>{{ league.maxRounds ?? 'No limit' }}</td>
              <td class="actions-col">
                <template v-if="deletingId === league.id">
                  <span class="confirm-text">Delete "{{ league.name }}"?</span>
                  <button type="button" class="link-btn danger" @click="doDelete(league)" data-testid="league-confirm-delete">
                    Yes
                  </button>
                  <button type="button" class="link-btn" @click="deletingId = null" data-testid="league-cancel-delete">
                    No
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="link-btn" @click="startEdit(league)" data-testid="league-edit-btn">
                    Edit
                  </button>
                  <button type="button" class="link-btn danger" @click="deletingId = league.id" data-testid="league-delete-btn">
                    Delete
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination">
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="pageIndex === 0 || loadingTable"
                  @click="prevPage"
                  data-testid="league-prev-page">
            Previous
          </button>
          <span class="page-indicator" data-testid="league-page-indicator">Page {{ pageIndex + 1 }}</span>
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="!hasNextPage || loadingTable"
                  @click="nextPage"
                  data-testid="league-next-page">
            Next
          </button>
        </div>
      </div>

      <h3 class="form-subheading">{{ isEditing ? 'Edit League' : 'Add League' }}</h3>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="name"
                 type="text"
                 class="field-input"
                 :class="{ 'field-input--error': errors.name }"
                 maxlength="150"
                 autocomplete="off"
                 :disabled="submitting"
                 data-testid="new-league-name-input" />
          <span v-if="errors.name" class="field-error" role="alert" data-testid="new-league-name-error">{{ errors.name }}</span>
        </label>

        <div class="config-grid">
          <div class="config-col">
            <h4>Trebles</h4>
            <label class="field">
              <span class="field-label">Games</span>
              <input v-model.number="numTrebles" type="number" min="0" class="field-input" :disabled="submitting" data-testid="new-league-num-trebles-input" />
            </label>
            <label class="field">
              <span class="field-label">Legs</span>
              <input v-model.number="treblesLegs" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-trebles-legs-input" />
            </label>
            <label class="field">
              <span class="field-label">Start Score</span>
              <input v-model.number="treblesStartScore" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-trebles-start-score-input" />
            </label>
          </div>

          <div class="config-col">
            <h4>Doubles</h4>
            <label class="field">
              <span class="field-label">Games</span>
              <input v-model.number="numDoubles" type="number" min="0" class="field-input" :disabled="submitting" data-testid="new-league-num-doubles-input" />
            </label>
            <label class="field">
              <span class="field-label">Legs</span>
              <input v-model.number="doublesLegs" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-doubles-legs-input" />
            </label>
            <label class="field">
              <span class="field-label">Start Score</span>
              <input v-model.number="doublesStartScore" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-doubles-start-score-input" />
            </label>
          </div>

          <div class="config-col">
            <h4>Singles</h4>
            <label class="field">
              <span class="field-label">Games</span>
              <input v-model.number="numSingles" type="number" min="0" class="field-input" :disabled="submitting" data-testid="new-league-num-singles-input" />
            </label>
            <label class="field">
              <span class="field-label">Legs</span>
              <input v-model.number="singlesLegs" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-singles-legs-input" />
            </label>
            <label class="field">
              <span class="field-label">Start Score</span>
              <input v-model.number="singlesStartScore" type="number" min="1" class="field-input" :disabled="submitting" data-testid="new-league-singles-start-score-input" />
            </label>
          </div>
        </div>
        <span v-if="errors.gameCounts" class="field-error" role="alert" data-testid="new-league-game-counts-error">{{ errors.gameCounts }}</span>
        <span v-if="errors.legCounts" class="field-error" role="alert" data-testid="new-league-leg-counts-error">{{ errors.legCounts }}</span>
        <span v-if="errors.startScores" class="field-error" role="alert" data-testid="new-league-start-scores-error">{{ errors.startScores }}</span>

        <label class="field">
          <span class="field-label">Max Rounds (blank = no limit)</span>
          <input v-model="maxRoundsInput"
                 type="number"
                 min="1"
                 class="field-input"
                 :class="{ 'field-input--error': errors.maxRounds }"
                 :disabled="submitting"
                 data-testid="new-league-max-rounds-input" />
          <span v-if="errors.maxRounds" class="field-error" role="alert" data-testid="new-league-max-rounds-error">{{ errors.maxRounds }}</span>
        </label>

        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-league-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-league-submit">
            {{ submitButtonLabel }}
          </button>
          <button v-if="isEditing" type="button" class="control-btn back-btn" @click="cancelEdit" data-testid="new-league-cancel-edit">
            Cancel
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-league-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { validateNewLeague, hasErrors, type NewLeagueErrors } from '@/validation/leagueValidation'
  import { createLeague, deleteLeague, fetchLeaguesPage, updateLeague, type LeagueInput } from '@/actions/LeagueService'
  import { pageAfterDelete } from '@/pagination/page'
  import type { League } from '@/models/LeagueModel'

  defineEmits<{
    (e: 'done'): void
  }>()

  const leagues = ref<League[]>([])
  const pageIndex = ref(0)
  const hasNextPage = ref(false)
  const loadingTable = ref(true)
  const deletingId = ref<string | null>(null)

  const editingLeagueId = ref<string | null>(null)
  const isEditing = computed(() => editingLeagueId.value !== null)
  const submitButtonLabel = computed(() => {
    if (submitting.value) return isEditing.value ? 'Saving…' : 'Adding…'
    return isEditing.value ? 'Save Changes' : 'Add League'
  })

  const name = ref('')
  const numTrebles = ref(2)
  const numDoubles = ref(3)
  const numSingles = ref(6)
  const treblesLegs = ref(1)
  const doublesLegs = ref(1)
  const singlesLegs = ref(3)
  const treblesStartScore = ref(701)
  const doublesStartScore = ref(601)
  const singlesStartScore = ref(501)
  // A plain string field, not a number ref - so an empty box unambiguously
  // means "no limit" (null) rather than colliding with a real 0.
  const maxRoundsInput = ref('')

  const errors = ref<NewLeagueErrors>({})
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  function currentInput(): LeagueInput {
    return {
      name: name.value,
      numTrebles: Number(numTrebles.value),
      numDoubles: Number(numDoubles.value),
      numSingles: Number(numSingles.value),
      treblesLegs: Number(treblesLegs.value),
      doublesLegs: Number(doublesLegs.value),
      singlesLegs: Number(singlesLegs.value),
      treblesStartScore: Number(treblesStartScore.value),
      doublesStartScore: Number(doublesStartScore.value),
      singlesStartScore: Number(singlesStartScore.value),
      maxRounds: maxRoundsInput.value === '' ? null : Number(maxRoundsInput.value),
    }
  }

  async function loadPage(index: number) {
    loadingTable.value = true
    const page = await fetchLeaguesPage(index)
    leagues.value = page.items
    hasNextPage.value = page.hasNextPage
    pageIndex.value = index
    loadingTable.value = false
  }

  function nextPage() {
    if (hasNextPage.value) loadPage(pageIndex.value + 1)
  }

  function prevPage() {
    if (pageIndex.value > 0) loadPage(pageIndex.value - 1)
  }

  function startEdit(league: League) {
    editingLeagueId.value = league.id
    name.value = league.name
    numTrebles.value = league.numTrebles
    numDoubles.value = league.numDoubles
    numSingles.value = league.numSingles
    treblesLegs.value = league.treblesLegs
    doublesLegs.value = league.doublesLegs
    singlesLegs.value = league.singlesLegs
    treblesStartScore.value = league.treblesStartScore
    doublesStartScore.value = league.doublesStartScore
    singlesStartScore.value = league.singlesStartScore
    maxRoundsInput.value = league.maxRounds == null ? '' : String(league.maxRounds)
    errors.value = {}
    successMessage.value = null
    deletingId.value = null
  }

  function resetForm() {
    name.value = ''
    numTrebles.value = 2
    numDoubles.value = 3
    numSingles.value = 6
    treblesLegs.value = 1
    doublesLegs.value = 1
    singlesLegs.value = 3
    treblesStartScore.value = 701
    doublesStartScore.value = 601
    singlesStartScore.value = 501
    maxRoundsInput.value = ''
  }

  function cancelEdit() {
    editingLeagueId.value = null
    resetForm()
    errors.value = {}
  }

  async function doDelete(league: League) {
    deletingId.value = null
    const deleted = await deleteLeague(league.id)
    // On failure, apiClient already surfaced why via the global error toast
    // (most commonly: a Season is still linked to this league).
    if (deleted) {
      if (editingLeagueId.value === league.id) cancelEdit()
      await loadPage(pageAfterDelete(pageIndex.value, leagues.value.length))
    }
  }

  async function submit() {
    successMessage.value = null

    const input = currentInput()
    const validationErrors = validateNewLeague(input)
    errors.value = validationErrors
    if (hasErrors(validationErrors)) return

    submitting.value = true
    try {
      if (isEditing.value) {
        const league = await updateLeague(editingLeagueId.value!, { ...input, name: input.name.trim() })
        if (league) {
          successMessage.value = `"${league.name}" saved.`
          cancelEdit()
          await loadPage(pageIndex.value)
        }
      } else {
        const league = await createLeague({ ...input, name: input.name.trim() })
        if (league) {
          successMessage.value = `"${league.name}" added.`
          resetForm()
          await loadPage(0)
        }
      }
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    loadPage(0)
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

  .manage-leagues {
    width: 760px;
    max-width: 95vw;
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

  .form-subheading {
    font-size: 1.1rem;
    font-weight: bold;
    margin: 2rem 0 1rem 0;
    color: #2c3e50;
  }

  .table-wrap {
    min-height: 4rem;
    overflow-x: auto;
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

  .data-table {
    width: 100%;
    border-collapse: collapse;
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
    font-size: 0.85rem;
    white-space: nowrap;
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

  .confirm-text {
    font-size: 0.85rem;
    color: #2c3e50;
    margin-right: 0.5rem;
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

    .link-btn.danger {
      color: #e74c3c;
    }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .page-indicator {
    font-size: 0.9rem;
    color: #2c3e50;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 1rem 0;
  }

  .config-col h4 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
    font-size: 0.95rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  .field-label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }

  .field-input {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: #3498db;
  }

  .field-input--error {
    border-color: #e74c3c;
  }

  .field-error {
    display: block;
    color: #e74c3c;
    font-size: 0.9rem;
    margin: 0.25rem 0 0.75rem 0;
  }

  .success-message {
    color: #1f8a4c;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
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

    .control-btn:hover:not(:disabled) {
      background: #506E8BFF;
    }

    .control-btn:disabled {
      opacity: 0.7;
      cursor: default;
    }

  .back-btn {
    background: #888;
    color: #fff;
  }

    .back-btn:hover:not(:disabled) {
      background: #555;
    }
</style>
