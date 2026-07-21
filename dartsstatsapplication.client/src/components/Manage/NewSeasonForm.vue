<template>
  <div class="center-content">
    <div class="manage-seasons">
      <h2 class="form-heading">Seasons</h2>

      <div class="table-wrap">
        <div v-if="loadingTable" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>League</th>
              <th>Team</th>
              <th>Status</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="seasons.length === 0">
              <td colspan="5" class="empty-row">No seasons yet.</td>
            </tr>
            <tr v-for="season in seasons" :key="season.id" class="data-row" data-testid="season-row">
              <td>{{ season.name }}</td>
              <td>{{ leagueName(season.leagueId) }}</td>
              <td>{{ teamName(season.teamId) }}</td>
              <td><span class="status-badge" :class="season.status.toLowerCase()">{{ season.status }}</span></td>
              <td class="actions-col">
                <template v-if="deletingId === season.id">
                  <span class="confirm-text">Delete "{{ season.name }}"?</span>
                  <button type="button" class="link-btn danger" @click="doDelete(season)" data-testid="season-confirm-delete">
                    Yes
                  </button>
                  <button type="button" class="link-btn" @click="deletingId = null" data-testid="season-cancel-delete">
                    No
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="link-btn" @click="startEdit(season)" data-testid="season-edit-btn">
                    Edit
                  </button>
                  <button type="button" class="link-btn danger" @click="deletingId = season.id" data-testid="season-delete-btn">
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
                  data-testid="season-prev-page">
            Previous
          </button>
          <span class="page-indicator" data-testid="season-page-indicator">Page {{ pageIndex + 1 }}</span>
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="!hasNextPage || loadingTable"
                  @click="nextPage"
                  data-testid="season-next-page">
            Next
          </button>
        </div>
      </div>

      <h3 class="form-subheading">{{ isEditing ? 'Edit Season' : 'Add Season' }}</h3>

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
                 data-testid="new-season-name-input" />
          <span v-if="errors.name" class="field-error" role="alert" data-testid="new-season-name-error">{{ errors.name }}</span>
        </label>

        <label class="field">
          <span class="field-label">League</span>
          <select v-model="leagueId"
                  class="field-input"
                  :class="{ 'field-input--error': errors.leagueId }"
                  :disabled="submitting"
                  data-testid="new-season-league-input">
            <option value="">Select a League</option>
            <option v-for="league in leagues" :key="league.id" :value="league.id">{{ league.name }}</option>
          </select>
          <span v-if="errors.leagueId" class="field-error" role="alert" data-testid="new-season-league-error">{{ errors.leagueId }}</span>
        </label>

        <label class="field">
          <span class="field-label">Team</span>
          <select v-model="teamId"
                  class="field-input"
                  :class="{ 'field-input--error': errors.teamId }"
                  :disabled="submitting"
                  data-testid="new-season-team-input">
            <option value="">Select a Team</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
          </select>
          <span v-if="errors.teamId" class="field-error" role="alert" data-testid="new-season-team-error">{{ errors.teamId }}</span>
        </label>

        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-season-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-season-submit">
            {{ submitButtonLabel }}
          </button>
          <button v-if="isEditing" type="button" class="control-btn back-btn" @click="cancelEdit" data-testid="new-season-cancel-edit">
            Cancel
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-season-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { validateNewSeason, hasErrors, type NewSeasonErrors } from '@/validation/seasonValidation'
  import { createSeason, deleteSeason, fetchSeasonsPage, updateSeason } from '@/actions/SeasonService'
  import { getLeagues } from '@/actions/LeagueService'
  import { getTeams } from '@/actions/TeamService'
  import { pageAfterDelete } from '@/pagination/page'
  import type { Season } from '@/models/SeasonModel'
  import type { League } from '@/models/LeagueModel'
  import type { Team } from '@/models/TeamModel'

  defineEmits<{
    (e: 'done'): void
  }>()

  const seasons = ref<Season[]>([])
  const leagues = ref<League[]>([])
  const teams = ref<Team[]>([])
  const pageIndex = ref(0)
  const hasNextPage = ref(false)
  const loadingTable = ref(true)
  const deletingId = ref<string | null>(null)

  const editingSeasonId = ref<string | null>(null)
  const isEditing = computed(() => editingSeasonId.value !== null)
  const submitButtonLabel = computed(() => {
    if (submitting.value) return isEditing.value ? 'Saving…' : 'Adding…'
    return isEditing.value ? 'Save Changes' : 'Add Season'
  })

  const name = ref('')
  const leagueId = ref('')
  const teamId = ref('')
  const errors = ref<NewSeasonErrors>({})
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  function leagueName(id: string): string {
    return leagues.value.find((l) => l.id === id)?.name ?? 'Unknown League'
  }

  function teamName(id: string): string {
    return teams.value.find((t) => t.id === id)?.name ?? 'Unknown Team'
  }

  async function loadPage(index: number) {
    loadingTable.value = true
    const page = await fetchSeasonsPage(index)
    seasons.value = page.items
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

  function startEdit(season: Season) {
    editingSeasonId.value = season.id
    name.value = season.name
    leagueId.value = season.leagueId
    teamId.value = season.teamId
    errors.value = {}
    successMessage.value = null
    deletingId.value = null
  }

  function cancelEdit() {
    editingSeasonId.value = null
    name.value = ''
    leagueId.value = ''
    teamId.value = ''
    errors.value = {}
  }

  async function doDelete(season: Season) {
    deletingId.value = null
    const deleted = await deleteSeason(season.id)
    // On failure, apiClient already surfaced why via the global error toast
    // (most commonly: a Match is still linked to this season).
    if (deleted) {
      if (editingSeasonId.value === season.id) cancelEdit()
      await loadPage(pageAfterDelete(pageIndex.value, seasons.value.length))
    }
  }

  async function submit() {
    successMessage.value = null

    const input = { name: name.value, leagueId: leagueId.value, teamId: teamId.value }
    const validationErrors = validateNewSeason(input)
    errors.value = validationErrors
    if (hasErrors(validationErrors)) return

    submitting.value = true
    try {
      if (isEditing.value) {
        // The server rejects changing leagueId/teamId once the season already
        // has a linked Match (name always stays editable) - surfaced via the
        // usual global error toast if that's attempted, same as any other
        // server-side rule in this app.
        const season = await updateSeason(editingSeasonId.value!, { ...input, name: input.name.trim() })
        if (season) {
          successMessage.value = `"${season.name}" saved.`
          cancelEdit()
          await loadPage(pageIndex.value)
        }
      } else {
        const season = await createSeason({ ...input, name: input.name.trim() })
        if (season) {
          successMessage.value = `"${season.name}" added.`
          name.value = ''
          leagueId.value = ''
          teamId.value = ''
          errors.value = {}
          await loadPage(0)
        }
      }
    } finally {
      submitting.value = false
    }
  }

  onMounted(async () => {
    const [leagueList, teamList] = await Promise.all([getLeagues(), getTeams()])
    leagues.value = leagueList
    teams.value = teamList
    await loadPage(0)
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

  .manage-seasons {
    width: 680px;
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
  }

  .data-row td {
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid #eef1f3;
    font-size: 0.9rem;
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

  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .status-badge.active {
    background: #e6f6ec;
    color: #1f8a4c;
  }

  .status-badge.closed {
    background: #eef1f3;
    color: #7f8c9a;
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
