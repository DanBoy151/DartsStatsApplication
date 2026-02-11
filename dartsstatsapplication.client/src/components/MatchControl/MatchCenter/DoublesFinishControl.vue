<template>
  <div class="doubles-finish-overlay">
    <div class="doubles-finish-dialog">
      <div class="doubles-finish-question">How many darts to finish?</div>
      <div class="doubles-finish-buttons">
        <button @click="$emit('result', 1)">1</button>
        <button @click="$emit('result', 2)">2</button>
        <button @click="$emit('result', 3)">3</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
  .doubles-finish-overlay {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .doubles-finish-dialog {
    background: #fff;
    border-radius: 12px;
    padding: 2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    text-align: center;
  }

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
