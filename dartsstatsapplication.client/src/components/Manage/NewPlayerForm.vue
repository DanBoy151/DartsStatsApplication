<template>
  <div class="center-content">
    <div class="manage-players">
      <h2 class="form-heading">Players</h2>

      <div class="table-wrap">
        <div v-if="loadingTable" class="loading-indicator">
          <span class="spinner"></span>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="players.length === 0">
              <td colspan="2" class="empty-row">No players yet.</td>
            </tr>
            <tr v-for="player in players" :key="player.playerId" class="data-row" data-testid="player-row">
              <td>{{ player.name }}</td>
              <td class="actions-col">
                <template v-if="deletingId === player.playerId">
                  <span class="confirm-text">Delete "{{ player.name }}"?</span>
                  <button type="button" class="link-btn danger" @click="doDelete(player)" data-testid="player-confirm-delete">
                    Yes
                  </button>
                  <button type="button" class="link-btn" @click="deletingId = null" data-testid="player-cancel-delete">
                    No
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="link-btn" @click="startEdit(player)" data-testid="player-edit-btn">
                    Edit
                  </button>
                  <button type="button" class="link-btn danger" @click="deletingId = player.playerId" data-testid="player-delete-btn">
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
                  data-testid="player-prev-page">
            Previous
          </button>
          <span class="page-indicator" data-testid="player-page-indicator">Page {{ pageIndex + 1 }}</span>
          <button type="button"
                  class="control-btn back-btn"
                  :disabled="!hasNextPage || loadingTable"
                  @click="nextPage"
                  data-testid="player-next-page">
            Next
          </button>
        </div>
      </div>

      <h3 class="form-subheading">{{ isEditing ? 'Edit Player' : 'Add Player' }}</h3>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="name"
                 type="text"
                 class="field-input"
                 :class="{ 'field-input--error': fieldError }"
                 maxlength="100"
                 autocomplete="off"
                 :disabled="submitting"
                 data-testid="new-player-name-input" />
        </label>
        <p v-if="fieldError" class="field-error" role="alert" data-testid="new-player-error">
          {{ fieldError }}
        </p>

        <label class="field">
          <span class="field-label">Team</span>
          <select v-model="teamId"
                  class="field-input"
                  :disabled="submitting"
                  data-testid="new-player-team-input">
            <option value="">No Team</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
          </select>
        </label>
        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-player-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-player-submit">
            {{ submitButtonLabel }}
          </button>
          <button v-if="isEditing" type="button" class="control-btn back-btn" @click="cancelEdit" data-testid="new-player-cancel-edit">
            Cancel
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-player-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { validatePlayerName } from '@/validation/playerValidation'
  import { createPlayer, deletePlayer, fetchPlayersPage, updatePlayer } from '@/actions/PlayerService'
  import { getTeams } from '@/actions/TeamService'
  import { pageAfterDelete } from '@/pagination/page'
  import type { Player } from '@/models/PlayerModel'
  import type { Team } from '@/models/TeamModel'

  defineEmits<{
    (e: 'done'): void
  }>()

  const players = ref<Player[]>([])
  const teams = ref<Team[]>([])
  const pageIndex = ref(0)
  const hasNextPage = ref(false)
  const loadingTable = ref(true)
  const deletingId = ref<string | null>(null)

  const editingPlayerId = ref<string | null>(null)
  const isEditing = computed(() => editingPlayerId.value !== null)
  const submitButtonLabel = computed(() => {
    if (submitting.value) return isEditing.value ? 'Saving…' : 'Adding…'
    return isEditing.value ? 'Save Changes' : 'Add Player'
  })

  const name = ref('')
  const teamId = ref('')
  const fieldError = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  async function loadPage(index: number) {
    loadingTable.value = true
    const page = await fetchPlayersPage(index)
    players.value = page.items
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

  function startEdit(player: Player) {
    editingPlayerId.value = player.playerId
    name.value = player.name
    teamId.value = player.teamId ?? ''
    fieldError.value = null
    successMessage.value = null
    deletingId.value = null
  }

  function cancelEdit() {
    editingPlayerId.value = null
    name.value = ''
    teamId.value = ''
    fieldError.value = null
  }

  async function doDelete(player: Player) {
    deletingId.value = null
    const deleted = await deletePlayer(player.playerId)
    // On failure, apiClient already surfaced why via the global error toast
    // (most commonly: this player is already on a Match roster or Game).
    if (deleted) {
      if (editingPlayerId.value === player.playerId) cancelEdit()
      await loadPage(pageAfterDelete(pageIndex.value, players.value.length))
    }
  }

  async function submit() {
    successMessage.value = null

    const error = validatePlayerName(name.value)
    fieldError.value = error
    if (error) return

    submitting.value = true
    try {
      if (isEditing.value) {
        const player = await updatePlayer(editingPlayerId.value!, name.value.trim(), teamId.value || null)
        if (player) {
          successMessage.value = `"${player.name}" saved.`
          cancelEdit()
          await loadPage(pageIndex.value)
        }
      } else {
        const player = await createPlayer(name.value.trim(), teamId.value || null)
        if (player) {
          successMessage.value = `"${player.name}" added.`
          name.value = ''
          teamId.value = ''
          await loadPage(0)
        }
      }
    } finally {
      submitting.value = false
    }
  }

  onMounted(async () => {
    teams.value = await getTeams()
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

  .manage-players {
    width: 520px;
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
    margin: 0.5rem 0 0 0;
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
