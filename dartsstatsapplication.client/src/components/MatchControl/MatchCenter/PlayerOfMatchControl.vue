<template>
  <div class="player-of-match-overlay">
    <div class="player-of-match-dialog">
      <div class="player-of-match-question">Player of the Match</div>
      <select v-model="selectedPlayerId" class="player-of-match-select" data-testid="player-of-match-select">
        <option value="">Select a Player</option>
        <option v-for="player in players" :key="player.playerId" :value="player.playerId">{{ player.name }}</option>
      </select>
      <div class="player-of-match-buttons">
        <button data-testid="player-of-match-cancel" @click="$emit('result', null)">Cancel</button>
        <button data-testid="player-of-match-confirm" :disabled="!selectedPlayerId" @click="$emit('result', selectedPlayerId)">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  defineProps<{
    players: { playerId: string; name: string }[]
  }>()

  defineEmits<{ result: [playerId: string | null] }>()

  const selectedPlayerId = ref('')
</script>

<style scoped>
  .player-of-match-overlay {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .player-of-match-dialog {
    background: #fff;
    border-radius: 12px;
    padding: 2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 300px;
  }

  .player-of-match-question {
    font-size: 1.5rem;
  }

  .player-of-match-select {
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
    background: #fff;
  }

  .player-of-match-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .player-of-match-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .player-of-match-buttons button:hover:not(:disabled) {
        background: #506E8BFF;
      }

      .player-of-match-buttons button:disabled {
        background: #bcc4cc;
        cursor: not-allowed;
      }
</style>
