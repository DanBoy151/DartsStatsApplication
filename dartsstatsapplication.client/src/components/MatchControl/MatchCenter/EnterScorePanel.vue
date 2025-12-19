<template>
  <div class="enter-score-panel">
    <h2>Next Player: Dan</h2>
    <div v-if="error" class="error-message">{{ error }}</div>
    <form class="input-row" @submit.prevent="submit">
      <input class="score-input"
             type="text"
             placeholder="Enter score"
             v-model="scoreValue" />
      <button class="no-score-btn" type="button" onclick="noScore">No Score</button>
      <button class="submit-btn" type="submit">Submit</button>
    </form>

  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';

  const scoreValue = ref('');
  const error = ref('');

  function validateScore(value: string): boolean {
    // Only allow integers between 0 and 180
    const num = Number(value);
    if (!value) {
      error.value = 'Please enter a score.';
      return false;
    }
    if (!/^\d+$/.test(value)) {
      error.value = 'Score must be a positive integer.';
      return false;
    }
    if (num < 0 || num > 180) {
      error.value = 'Score must be between 0 and 180.';
      return false;
    }
    error.value = '';
    return true;
  }

  function submit() {
    if (!validateScore(scoreValue.value)) {
      return;
    }
    // Replace with your actual submit logic
    alert(`Submitted score: ${scoreValue.value}`);

    scoreValue.value = '';
  }

  function noScore() {
    // Replace with your actual submit logic
    alert(`No Score`);

    scoreValue.value = '';
  }
</script>

<style scoped>
  .enter-score-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .input-row {
    display: flex;
    align-items: center;
    margin-top: 2rem;
    gap: 1rem;
  }

  .score-input {
    padding: 0.75rem 1.5rem;
    font-size: 2rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    width: 220px;
    text-align: center;
  }

  .no-score-btn {
    background: #e74c3c;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1.5rem;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .no-score-btn:hover {
      background: #c0392b;
    }

  .submit-btn {
    background: #2c3e50;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1.5rem;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .submit-btn:hover {
      background: #506E8BFF;
    }

  .error-message {
    color: #e74c3c;
    margin-top: 1rem;
    font-size: 1.1rem;
    text-align: center;
  }
</style>
