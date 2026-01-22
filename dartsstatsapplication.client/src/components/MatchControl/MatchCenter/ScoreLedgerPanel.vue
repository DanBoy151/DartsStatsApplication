<template>
  <div class="score-ledger-grid">
    <div v-for="rowIndex in 15"
         :key="rowIndex"
         class="score-row">
      <div class="cell label-cell">{{ rowIndex * 3 }}</div>
      <div class="cell"></div>
      <div class="cell"></div>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue';

  export default defineComponent({});
</script>

<style scoped>
  .score-ledger-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%; /* Take full height of parent */
    overflow-y: auto; /* Enable vertical scrolling */
  }

  .score-row {
    display: grid;
    grid-template-columns: 0.5fr 0.5fr 1fr;
    gap: 0.5rem;
  }

  .cell {
    border: 1px solid #ccc;
    padding: 0.5rem;
    background: #f9f9f9;
    text-align: center;
  }

  .label-cell {
    background: #e0e0e0; /* grey background for first column */
    font-weight: bold;
  }
</style>
