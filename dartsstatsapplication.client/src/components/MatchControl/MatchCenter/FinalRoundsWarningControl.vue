<template>
  <ModalDialog dialog-class="final-rounds-warning-dialog">
    <div class="final-rounds-warning-title">{{ roundsLeft }} rounds to go</div>
    <div class="final-rounds-warning-detail">
      Round {{ round }} of {{ maxRounds }} - if nobody checks out by the end of round {{ maxRounds }}, the leg goes to a bull-off.
    </div>
    <div class="final-rounds-warning-buttons">
      <button data-testid="final-rounds-warning-ok" @click="$emit('acknowledge')">OK</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import ModalDialog from './ModalDialog.vue'

  defineProps<{
    round: number
    maxRounds: number
    roundsLeft: number
  }>()

  defineEmits<{ acknowledge: [] }>()
</script>

<style scoped>
  .final-rounds-warning-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }

  .final-rounds-warning-detail {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    max-width: 28rem;
  }

  .final-rounds-warning-buttons {
    display: flex;
    justify-content: center;
  }

    .final-rounds-warning-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 2rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .final-rounds-warning-buttons button:hover {
        background: #506E8BFF;
      }
</style>
