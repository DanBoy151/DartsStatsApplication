<script setup lang="ts">
  import { ref } from 'vue'
  import MenuBar from './components/MenuBar.vue'
  import MainContent from './components/MainContent.vue'
  import ErrorToast from './components/ErrorToast.vue'
  import NewPlayerForm from './components/Manage/NewPlayerForm.vue'
  import NewMatchForm from './components/Manage/NewMatchForm.vue'
  import MatchReport from './components/Manage/MatchReport.vue'
  import NewLeagueForm from './components/Manage/NewLeagueForm.vue'
  import NewTeamForm from './components/Manage/NewTeamForm.vue'
  import NewSeasonForm from './components/Manage/NewSeasonForm.vue'
  import TeamStatistics from './components/Statistics/TeamStatistics.vue'
  import PlayerStatistics from './components/Statistics/PlayerStatistics.vue'
  import CurrentSeasonMatches from './components/Match/CurrentSeasonMatches.vue'

  type View = 'main' | 'new-player' | 'new-match' | 'new-league' | 'new-team' | 'new-season' | 'statistics' | 'player-statistics' | 'match-report' | 'current-season'

  const currentView = ref<View>('main')
  // Set when arriving at Player Statistics via a specific player (from the
  // menu it stays null, and PlayerStatistics.vue starts with its own
  // selector blank).
  const selectedPlayerId = ref<string | null>(null)
  // Set when arriving at the Match Report via Fixtures > Current Season's
  // View action.
  const selectedMatchId = ref<string | null>(null)

  function handleNavigate(action: string) {
    if (
      action === 'new-player' ||
      action === 'new-match' ||
      action === 'new-league' ||
      action === 'new-team' ||
      action === 'new-season' ||
      action === 'statistics' ||
      action === 'current-season'
    ) {
      currentView.value = action
    } else if (action === 'player-statistics') {
      selectedPlayerId.value = null
      currentView.value = action
    }
  }

  function handleViewPlayer(playerId: string) {
    selectedPlayerId.value = playerId
    currentView.value = 'player-statistics'
  }

  function handleViewMatch(matchId: string) {
    selectedMatchId.value = matchId
    currentView.value = 'match-report'
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
      <NewLeagueForm v-else-if="currentView === 'new-league'" @done="goToMain" />
      <NewTeamForm v-else-if="currentView === 'new-team'" @done="goToMain" />
      <NewSeasonForm v-else-if="currentView === 'new-season'" @done="goToMain" />
      <TeamStatistics v-else-if="currentView === 'statistics'" @done="goToMain" @view-player="handleViewPlayer" />
      <PlayerStatistics v-else-if="currentView === 'player-statistics'" :initial-player-id="selectedPlayerId ?? undefined" @done="goToMain" />
      <CurrentSeasonMatches v-else-if="currentView === 'current-season'" @done="goToMain" @view-match="handleViewMatch" />
      <MatchReport v-else-if="currentView === 'match-report'" :match-id="selectedMatchId ?? ''" @done="currentView = 'current-season'" />
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
