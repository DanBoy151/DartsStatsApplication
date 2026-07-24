<template>
  <ModalDialog dialog-class="bull-off-dialog">
    <div class="bull-off-question">Max rounds reached - won the bull-off?</div>
    <div class="bull-off-buttons">
      <button data-testid="bull-off-yes" @click="$emit('result', true)">Yes</button>
      <button data-testid="bull-off-no" @click="$emit('result', false)">No</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineEmits<{ result: [won: boolean] }>()
</script>

<style scoped>
  .bull-off-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .bull-off-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .bull-off-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .bull-off-buttons button:hover {
        background: #506E8BFF;
      }
</style>
