<template>
  <div class="drawer-overlay" @click="emit('close')"></div>
  <aside class="drawer-panel" aria-label="Games in this match">
    <button class="drawer-close" type="button" aria-label="Close" data-testid="close-games-drawer" @click="emit('close')">✕</button>
    <GameSummaryPanel variant="drawer"
                      :selected-game-id="selectedGameId"
                      :disabled="disabled"
                      @select-game="emit('select-game')" />
  </aside>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import GameSummaryPanel from '../GameSummaryPanel.vue'

  defineProps<{
    selectedGameId: string
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'close'): void
    (e: 'select-game'): void
  }>()

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
  /* Below ModalDialog.vue's z-index (1000) - a blocking popup (e.g. Won
     Bull-off) should always be able to appear above this if both were ever
     open at once. */
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(23, 32, 42, 0.44);
    z-index: 900;
  }

  .drawer-panel {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    width: min(420px, 90vw);
    background: #fff;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
    z-index: 901;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .drawer-close {
    position: absolute;
    top: 1.1rem;
    right: 1.1rem;
    z-index: 1;
    background: rgba(255, 255, 255, 0.18);
    border: none;
    color: #fff;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

    .drawer-close:hover {
      background: rgba(255, 255, 255, 0.32);
    }
</style>
