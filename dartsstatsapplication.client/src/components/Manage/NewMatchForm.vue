<template>
  <div class="center-content">
    <div class="manage-matches">
      <h2 class="form-heading">Matches</h2>

      <div class="table-wrap">
        <div v-if="loadingTable" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Opponent</th>
              <th>Date</th>
              <th>Location</th>
              <th>Status</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="matches.length === 0">
              <td colspan="5" class="empty-row">No matches yet.</td>
            </tr>
            <tr v-for="match in matches" :key="match.id" class="data-row" data-testid="match-row">
              <td>{{ match.opponent }}</td>
              <td>{{ formatDisplayDate(match.date) }}</td>
              <td>{{ match.location }}</td>
              <td>{{ match.status }}</td>
              <td class="actions-col">
                <template v-if="deletingId === match.id">
                  <span class="confirm-text">Delete "{{ match.opponent }}"?</span>
                  <button type="button" class="link-btn danger" @click="doDelete(match)" data-testid="match-confirm-delete">
                    Yes
                  </button>
                  <button type="button" class="link-btn" @click="deletingId = null" data-testid="match-cancel-delete">
                    No
                  </button>
                </template>
                <template v-else-if="match.status === 'Scheduled'">
                  <button type="button" class="link-btn" @click="startEdit(match)" data-testid="match-edit-btn">
                    Edit
                  </button>
                  <button type="button" class="link-btn danger" @click="deletingId = match.id" data-testid="match-delete-btn">
                    Delete
                  </button>
                </template>
                <span v-else class="not-editable" title="Only Scheduled matches can be edited or deleted">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination">
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="pageIndex === 0 || loadingTable"
                  @click="prevPage"
                  data-testid="match-prev-page">
            Previous
          </button>
          <span class="page-indicator" data-testid="match-page-indicator">Page {{ pageIndex + 1 }}</span>
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="!hasNextPage || loadingTable"
                  @click="nextPage"
                  data-testid="match-next-page">
            Next
          </button>
        </div>
      </div>

      <h3 class="form-subheading">{{ isEditing ? 'Edit Match' : 'Add Match' }}</h3>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span class="field-label">Opponent</span>
          <input v-model="opponent"
                 type="text"
                 class="field-input"
                 :class="{ 'field-input--error': errors.opponent }"
                 maxlength="200"
                 autocomplete="off"
                 :disabled="submitting"
                 data-testid="new-match-opponent-input" />
          <span v-if="errors.opponent" class="field-error" role="alert" data-testid="new-match-opponent-error">
            {{ errors.opponent }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">Date</span>
          <input v-model="date"
                 type="date"
                 class="field-input"
                 :class="{ 'field-input--error': errors.date }"
                 :disabled="submitting"
                 data-testid="new-match-date-input" />
          <span v-if="errors.date" class="field-error" role="alert" data-testid="new-match-date-error">
            {{ errors.date }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">Location</span>
          <select v-model="location"
                  class="field-input"
                  :class="{ 'field-input--error': errors.location }"
                  :disabled="submitting"
                  data-testid="new-match-location-input">
            <option value="Home">Home</option>
            <option value="Away">Away</option>
          </select>
          <span v-if="errors.location" class="field-error" role="alert" data-testid="new-match-location-error">
            {{ errors.location }}
          </span>
        </label>

        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-match-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-match-submit">
            {{ submitButtonLabel }}
          </button>
          <button v-if="isEditing" type="button" class="control-btn back-btn" @click="cancelEdit" data-testid="new-match-cancel-edit">
            Cancel
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-match-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { validateNewMatch, hasErrors, type NewMatchErrors } from '@/validation/matchValidation'
  import { createMatch, deleteMatch, fetchMatchesPage, updateMatch } from '@/actions/MatchService'
  import { pageAfterDelete } from '@/pagination/page'
  import { formatDisplayDate, toDateInputValue } from '@/utils/dateFormat'
  import type { Match } from '@/models/MatchModel'

  defineEmits<{
    (e: 'done'): void
  }>()

  const matches = ref<Match[]>([])
  const pageIndex = ref(0)
  const hasNextPage = ref(false)
  const loadingTable = ref(true)
  const deletingId = ref<string | null>(null)

  const editingMatchId = ref<string | null>(null)
  const isEditing = computed(() => editingMatchId.value !== null)
  const submitButtonLabel = computed(() => {
    if (submitting.value) return isEditing.value ? 'Saving…' : 'Adding…'
    return isEditing.value ? 'Save Changes' : 'Add Match'
  })

  const opponent = ref('')
  const date = ref('')
  const location = ref<'Home' | 'Away'>('Home')
  const errors = ref<NewMatchErrors>({})
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  async function loadPage(index: number) {
    loadingTable.value = true
    const page = await fetchMatchesPage(index)
    matches.value = page.items
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

  function startEdit(match: Match) {
    editingMatchId.value = match.id
    opponent.value = match.opponent
    date.value = toDateInputValue(match.date)
    location.value = match.location === 'Away' ? 'Away' : 'Home'
    errors.value = {}
    successMessage.value = null
    deletingId.value = null
  }

  function cancelEdit() {
    editingMatchId.value = null
    opponent.value = ''
    date.value = ''
    location.value = 'Home'
    errors.value = {}
  }

  async function doDelete(match: Match) {
    deletingId.value = null
    const deleted = await deleteMatch(match.id)
    // On failure, apiClient already surfaced why via the global error toast
    // (most commonly: this match is no longer Scheduled).
    if (deleted) {
      if (editingMatchId.value === match.id) cancelEdit()
      await loadPage(pageAfterDelete(pageIndex.value, matches.value.length))
    }
  }

  async function submit() {
    successMessage.value = null

    const validationErrors = validateNewMatch({ opponent: opponent.value, date: date.value, location: location.value })
    errors.value = validationErrors
    if (hasErrors(validationErrors)) return

    submitting.value = true
    try {
      if (isEditing.value) {
        const match = await updateMatch(editingMatchId.value!, {
          opponent: opponent.value.trim(),
          date: date.value,
          location: location.value,
        })
        if (match) {
          successMessage.value = `Match vs "${match.opponent}" saved.`
          cancelEdit()
          await loadPage(pageIndex.value)
        }
      } else {
        const match = await createMatch({
          opponent: opponent.value.trim(),
          date: date.value,
          location: location.value,
        })
        // On failure, apiClient already surfaced the reason via the global error
        // toast (see actions/apiClient.ts) - nothing extra to show here. On
        // success, stay put and clear the form rather than navigating away
        // immediately - a captain entering a season's fixture list wants to
        // add several matches in a row, and navigating away here would also
        // yank the success message off screen before it could be read.
        if (match) {
          successMessage.value = `Match vs "${match.opponent}" scheduled.`
          opponent.value = ''
          date.value = ''
          location.value = 'Home'
          errors.value = {}
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

  .manage-matches {
    width: 640px;
    max-width: 90vw;
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
  }

  .data-row td {
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid #eef1f3;
    font-size: 0.95rem;
  }

  .actions-col {
    text-align: right;
    white-space: nowrap;
  }

  .not-editable {
    color: #c3cbd4;
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
  }

  .field-label {
    font-weight: 600;
    color: #2c3e50;
  }

  .field-input {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
    background: #fff;
  }

  .field-input:focus {
    outline: none;
    border-color: #3498db;
  }

  .field-input--error {
    border-color: #e74c3c;
  }

  .field-error {
    color: #e74c3c;
    font-size: 0.9rem;
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
