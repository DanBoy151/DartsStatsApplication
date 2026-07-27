<template>
  <ModalDialog dialog-class="won-bull-dialog">
    <div class="won-bull-question">Did {{ playerNames || 'the players' }} win the Bull-Off?</div>
    <div class="won-bull-buttons">
      <button @click="$emit('result', true)">Yes</button>
      <button @click="$emit('result', false)">No</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineProps<{
    /** Resolved player name(s) for the game this bull-off decides, e.g.
     *  "Dave Chisnall" or "Dave Chisnall / Gary Anderson" - falls back to
     *  generic phrasing if names can't be resolved. */
    playerNames?: string
  }>()

  defineEmits<{ result: [won: boolean] }>()
</script>

<style scoped>
  .won-bull-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .won-bull-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .won-bull-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .won-bull-buttons button:hover {
        background: #506E8BFF;
      }
</style>
