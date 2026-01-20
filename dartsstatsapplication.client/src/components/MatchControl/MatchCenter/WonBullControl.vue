<template>
  <div class="won-bull-overlay">
    <div class="won-bull-dialog">
      <div class="won-bull-question">Did Player win the Bull-Off?</div>
      <div class="won-bull-buttons">
        <button @click="$emit('result', true)">Yes</button>
        <button @click="$emit('result', false)">No</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
  .won-bull-overlay {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .won-bull-dialog {
    background: #fff;
    border-radius: 12px;
    padding: 2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    text-align: center;
  }

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
