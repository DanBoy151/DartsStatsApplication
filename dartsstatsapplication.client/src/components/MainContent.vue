<script setup lang="ts">
  import { ref } from 'vue'
  import LaunchControl from './LaunchControl.vue'
  import MatchControl from './MatchControl.vue'

  const showMatchControl = ref(false)

  function handlePlayMatch() {
    showMatchControl.value = true
  }

  function handleBack() {
    showMatchControl.value = false
  }
</script>

<template>
  <div class="center-content">
    <transition name="fade">
      <component :is="showMatchControl ? MatchControl : LaunchControl"
                 @play-match="handlePlayMatch"
                 @back="handleBack"
                 key="main-content" />
    </transition>
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

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s;
  }

  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
</style>
