<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import LaunchCaptainControl from './LaunchCaptainControl.vue'
  import MatchControl from './MatchControl.vue'

  const showMatchControl = ref(false)
  const loading = ref(true)
  const error = ref('')
  const nextOpponent = ref('')
  const nextLocation = ref('')
  const matchId = ref('')

  const locationSuffix = computed(() => {
    if (nextLocation.value === 'Home') return '(H)'
    if (nextLocation.value === 'Away') return '(A)'
    return ''
  })

  function handlePlayMatch() {
    showMatchControl.value = true
  }

  function handleBack() {
    showMatchControl.value = false
  }

  async function fetchNextMatch() {
    loading.value = true
    error.value = ''
    nextOpponent.value = ''
    nextLocation.value = ''
    matchId.value = ''
    try {
      const response = await fetch('http://localhost:5001/api/Match/next')
      if (!response.ok) throw new Error('Failed to fetch next match')
      const data = await response.json()
      nextOpponent.value = data.data?.opponent ?? 'Unknown'
      nextLocation.value = data.data?.location ?? ''
      matchId.value = data.id ?? ''
    } catch (err: any) {
      error.value = err.message || 'Error fetching next match'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchNextMatch()
  })
</script>

<template>
  <div class="center-content">
    <transition name="fade">
      <div v-if="loading" key="loading" class="loading-indicator">
        <span class="spinner"></span>
      </div>
      <component v-else
                 :is="showMatchControl ? MatchControl : LaunchCaptainControl"
                 :nextOpponent="nextOpponent"
                 :locationSuffix="locationSuffix"
                 :matchId="matchId"
                 @play-match="handlePlayMatch"
                 @back="handleBack"
                 key="main-content" />
    </transition>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
  .center-content {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    width: 100%;
  }

  .loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 120px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 6px solid #2c3e50;
    border-top: 6px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    color: #e74c3c;
    font-size: 1.2rem;
    text-align: center;
    margin-top: 2rem;
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s;
  }

  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
</style>
