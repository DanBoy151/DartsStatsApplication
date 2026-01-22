<template>
  <div class="center-content">
    <transition name="fade">
      <div v-if="loading" key="loading" class="loading-indicator">
        <span class="spinner"></span>
      </div>
      <component v-else
                 :is="showMatchControl ? MatchControl : LaunchCaptainControl"
                 @play-match="handlePlayMatch"
                 @back="handleBack"
                 key="main-content" />
    </transition>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>


<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import LaunchCaptainControl from './LaunchCaptainControl.vue'
  import MatchControl from './MatchControl.vue'
  import { getNextMatch } from '@/actions/MatchService'
  import type { Match } from '@/models/MatchModel'

  const showMatchControl = ref(false)
  const loading = ref(true)
  const error = ref(false)
  const match = ref(null as Match | null)

  function handlePlayMatch() {
    showMatchControl.value = true
  }

  function handleBack() {
    showMatchControl.value = false
  }

  async function fetchNextMatch() {
    loading.value = true
    match.value = await getNextMatch()
    loading.value = false
  }

  onMounted(() => {
    fetchNextMatch()
  })
</script>

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
