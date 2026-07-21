<template>
  <div class="complete-match-overlay">
    <div class="complete-match-dialog">
      <div class="complete-match-question">All games are complete - finish the Match?</div>
      <div class="complete-match-buttons">
        <button data-testid="complete-match-yes" @click="$emit('result', true)">Yes</button>
        <button data-testid="complete-match-no" @click="$emit('result', false)">No</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineEmits<{ result: [confirmed: boolean] }>()
</script>

<style scoped>
  .complete-match-overlay {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .complete-match-dialog {
    background: #fff;
    border-radius: 12px;
    padding: 2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    text-align: center;
  }

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
