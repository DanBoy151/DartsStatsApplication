<template>
  <ModalDialog dialog-class="complete-match-dialog">
    <div class="complete-match-question">All games are complete - finish the Match?</div>
    <div class="complete-match-buttons">
      <button data-testid="complete-match-yes" @click="$emit('result', true)">Yes</button>
      <button data-testid="complete-match-no" @click="$emit('result', false)">No</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineEmits<{ result: [confirmed: boolean] }>()
</script>

<style scoped>
  .complete-match-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .complete-match-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .complete-match-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .complete-match-buttons button:hover {
        background: #506E8BFF;
      }
</style>
