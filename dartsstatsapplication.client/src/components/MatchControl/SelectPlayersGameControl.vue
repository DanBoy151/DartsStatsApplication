<template>
  <div class="select-players-game-control">
    <h2 class="player-list-heading">Select Players</h2>
    <div class="player-selectors">
      <div v-for="i in playerCount" :key="i" class="player-select-row">
        <label :for="'player-select-' + i">Player {{ i }}:</label>
        <select :id="'player-select-' + i"
                v-model="selectedPlayers[i - 1]"
                class="player-dropdown"
                :disabled="loadingPlayers || matchPlayers.length === 0">
          <option value="" disabled>
            {{ loadingPlayers ? 'Loading players...' : 'Select player' }}
          </option>
          <option v-for="player in availablePlayersFor(i - 1)"
                  :key="player.id"
                  :value="player.id">
            {{ player.name || player.id }}
          </option>
        </select>
      </div>
      <div v-if="!loadingPlayers && matchPlayers.length === 0" class="error-message">
        No players available.
      </div>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div class="button-row">
      <button class="control-btn" :disabled="!allSelected" @click="save">Save</button>
      <button class="control-btn back-btn" @click="cancel">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'

  const props = defineProps<{
    gameId: string
    gameType: string
    selectedMatchPlayers?: string[]
  }>()

  const emit = defineEmits<{
    (e: 'save'): void
    (e: 'cancel'): void
  }>()
  const error = ref('')
  const loadingPlayers = ref(false)

  const playerCount = computed(() => {
    switch (props.gameType.toLowerCase()) {
      case 'doubles':
      case 'double':
        return 2
      case 'trebles':
      case 'treble':
        return 3
      default:
        return 1
    }
  })

  const matchPlayers = ref<{ id: string, name: string }[]>([])

  async function fetchMatchPlayers() {
    loadingPlayers.value = true
    matchPlayers.value = []
    if (props.selectedMatchPlayers && props.selectedMatchPlayers.length) {
      const players = await Promise.all(
        props.selectedMatchPlayers.map(async id => {
          try {
            const res = await fetch(`http://localhost:5001/api/Player/${id}`)
            if (res.ok) {
              const player = await res.json()
              // Map to expected structure
              return {
                id: player.id,
                name: player.data?.name
              }
            }
          } catch { }
          return null
        })
      )
      matchPlayers.value = players.filter(
        (p): p is { id: string; name: string } => !!p
      )
    }
    loadingPlayers.value = false
  }

  watch(() => props.selectedMatchPlayers, fetchMatchPlayers, { immediate: true })

  const selectedPlayers = ref<string[]>(
    Array(playerCount.value).fill('')
  )

  watch(
    playerCount,
    (newCount) => {
      selectedPlayers.value = Array(newCount).fill('')
    },
    { immediate: true }
  )

  const allSelected = computed(() =>
    selectedPlayers.value.length === playerCount.value &&
    selectedPlayers.value.every((id) => !!id)
  )

  function availablePlayersFor(index: number) {
    // Exclude players selected in other dropdowns
    const selectedIds = selectedPlayers.value.filter((id, i) => i !== index && id);
    return matchPlayers.value.filter(player => !selectedIds.includes(player.id));
  }

  async function save() {
    error.value = ''
    try {
      // Only send non-empty player IDs
      const playerIds = selectedPlayers.value.filter(id => !!id)
      const response = await fetch(
        `http://localhost:5001/api/Game/${props.gameId}/update-players`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedPlayers: playerIds })
        }
      )
      if (!response.ok) {
        let message = 'Failed to update players'
        let bodyText = await response.text()
        try {
          const data = JSON.parse(bodyText)
          if (data && data.errors && typeof data.errors === 'object') {
            message = Object.values(data.errors).flat().join(' ')
          } else if (data && data.title) {
            message = data.title
          } else if (typeof data === 'string') {
            message = data
          }
        } catch {
          if (bodyText) {
            message = bodyText
          } else {
            message = response.statusText || message
          }
        }
        throw new Error(message)
      }
      emit('save')
    } catch (err: any) {
      error.value = err.message || 'Error updating players'
    }
  }

  function cancel() {
    emit('cancel')
  }

</script>



<style scoped>
  .select-players-game-control {
    width: 400px;
    max-width: 90vw;
    padding: 2rem;
    padding-bottom: 2.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
    background: #fff;
  }

  .player-list-heading {
    font-size: 1.4rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #2c3e50;
    text-align: center;
    width: 100%;
  }

  .player-selectors {
    width: 100%;
  }

  .player-select-row {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .player-dropdown {
    flex: 1;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #ccc;
    font-size: 1rem;
    background: #fff; /* Ensure white background */
    color: #2c3e50; /* Ensure dark text */
  }

    .player-dropdown option {
      background: #fff; /* Ensure white background for options */
      color: #2c3e50; /* Ensure dark text for options */
    }

  .error-message {
    color: #e74c3c;
    font-size: 1.2rem;
    text-align: center;
    margin-top: 2rem;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    width: 100%;
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

    .control-btn:disabled {
      background: #b0b8c1;
      cursor: not-allowed;
    }

    .control-btn:hover:enabled {
      background: #506E8BFF;
    }

  .back-btn {
    background: #888;
    color: #fff;
  }

    .back-btn:hover {
      background: #555;
    }
</style>
