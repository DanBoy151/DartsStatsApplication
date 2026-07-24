<template>
  <ModalDialog dialog-class="doubles-finish-dialog">
    <div class="doubles-finish-question">How many darts to finish?</div>
    <div class="doubles-finish-buttons">
      <button @click="$emit('result', 1)">1</button>
      <button @click="$emit('result', 2)">2</button>
      <button @click="$emit('result', 3)">3</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineEmits<{ result: [darts: 1 | 2 | 3] }>()
</script>

<style scoped>
  .doubles-finish-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .doubles-finish-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .doubles-finish-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .doubles-finish-buttons button:hover {
        background: #506E8BFF;
      }
</style>
