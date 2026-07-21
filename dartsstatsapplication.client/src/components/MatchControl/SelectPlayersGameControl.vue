<template>
  <div class="select-players-game-control">
    <h2 class="player-list-heading">Select Players</h2>
    <div class="player-selectors">
      <div v-for="(dropdown, idx) in playerCount"
           :key="idx"
           class="player-select-row">
        <select class="player-dropdown"
                v-model="selectedPlayerIds[idx]">
          <option value="" disabled>Select player</option>
          <option v-for="player in matchPlayers"
                  :key="player.playerId"
                  :value="player.playerId"
                  :disabled="selectedPlayerIds.includes(player.playerId) && selectedPlayerIds[idx] !== player.playerId">
            {{ player.name }}
          </option>
        </select>
      </div>
    </div>
    <div class="button-row">
      <button class="control-btn" @click="save" :disabled="!canSave">Save</button>
      <button class="control-btn back-btn" @click="cancel">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { setAvailablePlayers } from '@/actions/GameService'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import type { Player } from '@/models/PlayerModel'  

  const matchDataStore = useMatchDataStore()

  const emit = defineEmits<{
    (e: 'save'): void
    (e: 'cancel'): void
  }>()

  const playerCount = computed(() => {
    const type = matchDataStore.getSelectedGame()?.type ?? ''

    switch (type.toLowerCase()) {
      case 'doubles':
        return 2
      case 'trebles':
        return 3
      default:
        return 1
    }
  })


  const matchPlayers = ref<Player[]>([])
  const selectedPlayers = ref<Player[]>([])
  const selectedPlayerIds = ref<string[]>([])

  async function fetchMatchPlayers() {
    matchPlayers.value = []
    const storePlayers = matchDataStore.matchAvailablePlayers
    if (storePlayers && storePlayers.length) {
      matchPlayers.value = storePlayers
        .filter(p => p.isAvailable)
        .map(p => ({
          playerId: p.playerId,
          name: p.name,
          teamId: null
        }))
    }
    // Reset selectedPlayerIds when players are fetched
    selectedPlayerIds.value = Array(playerCount.value).fill('')
  }

  // Watch for playerCount changes and adjust selectedPlayerIds accordingly
  watch(playerCount, (newCount) => {
    if (selectedPlayerIds.value.length > newCount) {
      selectedPlayerIds.value = selectedPlayerIds.value.slice(0, newCount)
    } else {
      selectedPlayerIds.value = [
        ...selectedPlayerIds.value,
        ...Array(newCount - selectedPlayerIds.value.length).fill('')
      ]
    }
  })

  // Only enable save if all dropdowns have a selection and no duplicates
  const canSave = computed(() =>
    selectedPlayerIds.value.length === playerCount.value &&
    selectedPlayerIds.value.every(id => !!id) &&
    new Set(selectedPlayerIds.value).size === selectedPlayerIds.value.length
  )

  onMounted(fetchMatchPlayers)

  async function save() {
    // Map selected IDs to Player objects
    selectedPlayers.value = selectedPlayerIds.value
      .map(id => matchPlayers.value.find(p => p.playerId === id))
      .filter((p): p is Player => !!p)
    await setAvailablePlayers(selectedPlayers.value)
    emit('save')
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
