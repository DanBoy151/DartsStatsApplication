<template>
  <ModalDialog dialog-class="player-of-match-dialog" min-width="300px">
    <div class="player-of-match-question">Player of the Match</div>
    <select v-model="selectedPlayerId" class="player-of-match-select" data-testid="player-of-match-select">
      <option value="">Select a Player</option>
      <option v-for="player in players" :key="player.playerId" :value="player.playerId">{{ player.name }}</option>
    </select>
    <div class="player-of-match-buttons">
      <button data-testid="player-of-match-cancel" @click="$emit('result', null)">Cancel</button>
      <button data-testid="player-of-match-confirm" :disabled="!selectedPlayerId" @click="$emit('result', selectedPlayerId)">Confirm</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import ModalDialog from './ModalDialog.vue'

  defineProps<{
    players: { playerId: string; name: string }[]
  }>()

  defineEmits<{ result: [playerId: string | null] }>()

  const selectedPlayerId = ref('')
</script>

<style scoped>
  .player-of-match-question {
    font-size: 1.5rem;
    margin-bottom: 1.25rem;
  }

  .player-of-match-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
    background: #fff;
    box-sizing: border-box;
    margin-bottom: 1.25rem;
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
