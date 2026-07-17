<template>
  <div class="available-players-control">
    <h2 class="player-list-heading">Select Available Players</h2>
    <div v-if="loading" key="loading" class="loading-indicator">
      <span class="spinner"></span>
    </div>
    <div v-else class="player-list-container">
      <ul class="player-list">
        <li v-for="player in matchDataStore.matchAvailablePlayers" :key="player.playerId" class="player-item">
          <label>
            <input type="checkbox"
                   v-model="player.isAvailable" />
            {{ player.name }}
          </label>
        </li>
      </ul>
    </div>
    <div class="button-row">
      <button class="control-btn" @click="proceed">Proceed</button>
      <button class="control-btn back-btn" @click="back">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { getPlayers } from '@/actions/PlayerService'
  import { setAvailablePlayers } from '@/actions/MatchService'
  import { useMatchDataStore } from "@/stores/matchDataStore"

  const matchDataStore = useMatchDataStore()

  const emit = defineEmits<{
    (e: 'proceed'): void
    (e: 'back'): void
  }>()

  const loading = ref(true)

  async function fetchPlayers() {
    loading.value = true
    try {
      await getPlayers()
    }
    catch { }
    finally {
      loading.value = false
    }
  }

  async function proceed() {
    // Must await: the holding screen renders immediately once we emit, so
    // navigating before the save resolves could show the next screen before
    // the roster was actually persisted.
    await setAvailablePlayers()
    emit('proceed')
  }

  function back() {
    emit('back')
  }

  onMounted(() => {
    fetchPlayers()
  })
</script>

<style scoped>
  .panel-center {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .available-players-control {
    width: 400px;
    max-width: 90vw;
    padding: 2rem;
    padding-bottom: 2.5rem; /* extra space for buttons */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
  }

  .player-list-heading {
    font-size: 1.4rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #2c3e50;
    text-align: center;
    width: 100%;
  }

  .loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 120px;
    width: 100%;
  }

  .player-list-container {
    width: 100%;
    max-height: 18rem;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .player-list {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 100%;
    flex: 1 1 auto;
    max-height: 14rem;
    overflow-y: auto;
  }

  .player-item {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    width: 100%;
    margin-top: 2rem; /* gap above buttons */
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

    .control-btn:hover {
      background: #506E8BFF;
    }

  .back-btn {
    background: #888;
    color: #fff;
  }

    .back-btn:hover {
      background: #555;
    }

  .error-message {
    color: #e74c3c;
    font-size: 1rem;
    margin-top: 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 6px solid #2c3e50;
    border-top: 6px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
