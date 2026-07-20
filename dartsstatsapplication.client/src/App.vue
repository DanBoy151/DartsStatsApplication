<script setup lang="ts">
  import { ref } from 'vue'
  import MenuBar from './components/MenuBar.vue'
  import MainContent from './components/MainContent.vue'
  import ErrorToast from './components/ErrorToast.vue'
  import NewPlayerForm from './components/Manage/NewPlayerForm.vue'
  import NewMatchForm from './components/Manage/NewMatchForm.vue'
  import TeamStatistics from './components/Statistics/TeamStatistics.vue'

  type View = 'main' | 'new-player' | 'new-match' | 'statistics'

  const currentView = ref<View>('main')

  function handleNavigate(action: string) {
    if (action === 'new-player' || action === 'new-match' || action === 'statistics') {
      currentView.value = action
    }
  }

  function goToMain() {
    // v-if (not v-show) below, so this remounts MainContent, which re-fetches
    // the next match - picking up anything just created in these forms.
    currentView.value = 'main'
  }
</script>

<template>
  <div class="app-layout">
    <header>
      <MenuBar @navigate="handleNavigate" />
    </header>
    <main>
      <MainContent v-if="currentView === 'main'" @view-statistics="() => (currentView = 'statistics')" />
      <NewPlayerForm v-else-if="currentView === 'new-player'" @done="goToMain" />
      <NewMatchForm v-else-if="currentView === 'new-match'" @done="goToMain" />
      <TeamStatistics v-else-if="currentView === 'statistics'" @done="goToMain" />
    </main>
    <ErrorToast />
  </div>
</template>

<style scoped>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100vw;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #fff;
    overflow: auto;
  }

  header {
    width: 100%;
    background: #2c3e50;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  main {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    background: #fff;
    overflow: auto;
  }
</style>
