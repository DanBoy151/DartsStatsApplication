<template>
  <div class="button-group">
    <button class="large-square-btn play-match-btn" @click="onPlayMatch">
      <span class="btn-label">Play Match</span>
      <img src="./icons/dartboard.svg" alt="Dartboard" class="dartboard-img" />
      <div v-if="nextOpponent" class="next-match">
        Next Match: {{ nextOpponent }} {{ locationSuffix }}
      </div>
    </button>
    <button class="large-square-btn">
      <span class="btn-label">View Statistics</span>
      <img src="./icons/statistics.svg" alt="Statistics" class="statistics-img" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ref, defineProps } from 'vue'
  const props = defineProps<{
    nextOpponent: string
    locationSuffix: string
    matchId: string
  }>()

  const error = ref('')

  async function onPlayMatch() {
    error.value = ''
    try {
      if (props.matchId) {
        const response = await fetch(`http://localhost:5001/api/Match/${props.matchId}/start`, { method: 'PUT' })
        if (!response.ok) throw new Error('Failed to start match')
      }
      // Emit event after successful start
      // (or always emit, depending on your requirements)
      // You can also handle navigation or state here if needed
      // @ts-ignore
      // (ts-ignore is only needed if using defineEmits in script setup)
      // If you use defineEmits, use it instead of $emit
      // $emit('play-match')
      emit('play-match')
    } catch (err: any) {
      error.value = err.message || 'Error starting match'
    }
  }

  const emit = defineEmits<{
    (e: 'play-match'): void
  }>()
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

  .statistics-img {
    width: 120px;
    height: 120px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  .next-match {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    font-weight: normal;
    color: #2c3e50;
    text-align: center;
    word-break: break-word;
  }
</style>
