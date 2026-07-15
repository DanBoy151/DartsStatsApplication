<template>
  <div v-if="matchDataStore.lastError" class="error-toast" role="alert">
    <span class="error-toast-message">{{ matchDataStore.lastError }}</span>
    <button class="error-toast-dismiss" type="button" aria-label="Dismiss" @click="matchDataStore.clearError()">✕</button>
  </div>
</template>

<script setup lang="ts">
  import { useMatchDataStore } from '@/stores/matchDataStore'

  const matchDataStore = useMatchDataStore()
</script>

<style scoped>
  .error-toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: #e74c3c;
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 2000;
    max-width: 90vw;
  }

  .error-toast-message {
    font-size: 0.95rem;
    word-break: break-word;
  }

  .error-toast-dismiss {
    background: none;
    border: none;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }
</style>
