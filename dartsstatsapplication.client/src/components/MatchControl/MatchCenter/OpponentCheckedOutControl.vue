<template>
  <ModalDialog dialog-class="opponent-checkout-dialog">
    <div class="opponent-checkout-question">Max rounds reached - did your opponent check out?</div>
    <div class="opponent-checkout-buttons">
      <button data-testid="opponent-checked-out-yes" @click="$emit('result', true)">Yes</button>
      <button data-testid="opponent-checked-out-no" @click="$emit('result', false)">No</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineEmits<{ result: [opponentCheckedOut: boolean] }>()
</script>

<style scoped>
  .opponent-checkout-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .opponent-checkout-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

    .opponent-checkout-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .opponent-checkout-buttons button:hover {
        background: #506E8BFF;
      }
</style>
