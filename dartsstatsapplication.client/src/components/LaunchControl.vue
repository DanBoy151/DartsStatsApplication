<template>
  <div class="button-group">
    <button class="large-square-btn play-match-btn" @click="fetchNextMatch">
      <span class="btn-label">Play Match</span>
      <img src="./icons/dartboard.svg" alt="Dartboard" class="dartboard-img" />
      <div v-if="nextOpponent" class="next-match">
        Next Match: <strong>{{ nextOpponent }}</strong>
      </div>
    </button>
    <button class="large-square-btn">
      <span class="btn-label">View Statistics</span>
    </button>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  const nextOpponent = ref('')
  const error = ref('')

  async function fetchNextMatch() {
    nextOpponent.value = ''
    error.value = ''
    try {
      const response = await fetch('http://localhost:5001/api/Match/next')
      //if (!response.ok) throw new Error('Failed to fetch next match')
      const data = await response.json()
      // Assuming the API returns { opponent: "Team Name" }
      nextOpponent.value = data.opponent ?? 'Unknown'
    } catch (err: any) {
      error.value = err.message || 'Error fetching next match'
    }
  }
</script>

<style scoped>
  .button-group {
    display: flex;
    gap: 4rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    position: relative;
    flex-direction: row;
  }

  .large-square-btn {
    width: 300px;
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    font-weight: bold;
    border: 4px solid #2c3e50;
    border-radius: 24px;
    background: transparent;
    color: #2c3e50;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    transition: border-color 0.2s, box-shadow 0.2s;
    position: relative;
  }

    .large-square-btn:hover {
      border-color: #34495e;
      box-shadow: 0 6px 32px rgba(44, 62, 80, 0.25);
    }

  .btn-label {
    margin-bottom: 1.5rem;
    font-size: 2rem;
    text-align: center;
    display: block;
  }

  .play-match-btn .dartboard-img {
    width: 120px;
    height: 120px;
    object-fit: contain;
    display: block;
    margin: 0 auto 1rem auto;
  }

  .next-match {
    margin-top: 0.5rem;
    font-size: 1.3rem;
    color: #2c3e50;
    text-align: center;
    word-break: break-word;
  }

  .error-message {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -5rem;
    width: 100%;
    text-align: center;
    color: #e74c3c;
    font-size: 1.2rem;
  }
</style>
