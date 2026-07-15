<template>
  <div class="game-summary-panel">
    <div class="summary-header">
      <div class="summary-row">
        <span class="summary-label">Opposition:</span>
        <span class="summary-value">{{ matchDataStore.getMatchData()?.opposition }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Date:</span>
        <span class="summary-value">{{ formattedDate }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Current Score:</span>
        <span class="summary-value">{{ currentScore }}</span>
      </div>
    </div>
    <div class="games-list">
      <div v-for="game in games"
           :key="game.id"
           class="game-box"
           :class="{ selected: game.id === selectedGameId, disabled: props.disabled }"
           @click="handleSelectGame(game.id)">
        <div class="game-row">
          <span class="game-label">Players:</span>
          <span class="game-value">{{ displayPlayers(game) }}</span>
        </div>
        <div class="game-row">
          <span class="game-label">Type:</span>
          <span class="game-value">{{ game.type }}</span>
        </div>
        <div class="game-row">
          <span class="game-label">Status:</span>
          <span class="game-value">{{ game.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, defineProps, computed, onMounted, watch } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { getMatchGames } from "@/actions/MatchService"
  import type { Game } from '@/models/GameModel'
  import { convertToGameFromGameDataState, convertToGameListFromGameDataStateList } from '@/models/GameModel'

  const matchDataStore = useMatchDataStore()

  const games = ref<Game[]>([])

  // Replace with real data or props as needed
  const props = defineProps<{
    selectedGameId: string
    disabled?: boolean
  }>()

  const formattedDate = computed(() => {
    const date = matchDataStore.getMatchData()?.date;
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return String(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  });

  const currentScore = computed(() => {
    const match = matchDataStore.getMatchData();
    if (!match) return '0 - 0';

    const gamesFor = match.gamesFor ?? 0;
    const gamesAgainst = match.gamesAgainst ?? 0;
    const isHome = match.location === "Home";

    return isHome
      ? `${gamesFor} - ${gamesAgainst}`
      : `${gamesAgainst} - ${gamesFor}`;
  });

  function displayPlayers(game: Game): string {
    const availablePlayers = matchDataStore.getMatchAvailablePlayers();
    if (game.players && game.players.length > 0) {
      return game.players
        .map(id => {
          const player = availablePlayers.find(p => p.playerId === id);
          return player ? player.name : id;
        })
        .join('/');
    }

    switch (game.type.toLowerCase()) {
      case 'singles':
      case 'single':
        return '?'
      case 'doubles':
      case 'double':
        return '?/?'
      case 'trebles':
      case 'treble':
        return '?/?/?'
      default:
        return '?'
    }
  }
  const emit = defineEmits<{
    (e: 'select-game'): void
  }>()

  function handleSelectGame(gameId: string) {
    if (!props.disabled) {
      // emits the select-game event with the game id
      // $emit is available in <script setup> as just emit
      matchDataStore.setSelectedGame(gameId)

      emit('select-game')
    }
  }

  async function fetchGames() {
    const matchId = matchDataStore.getMatchData()?.matchId ?? ''
    games.value = await getMatchGames(matchId) ?? []
  }

  onMounted(fetchGames)

  watch(
    () => matchDataStore.getMatchData()?.games,
    (newGames) => {
      games.value = convertToGameListFromGameDataStateList(newGames ?? null) ?? []
    },
    { deep: true }
  )

</script>

<style scoped>
  .game-summary-panel {
    width: 100%;
    max-width: 600px;
    margin: 1.5rem auto 1.5rem auto; /* <-- top and bottom margin for indent */
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .summary-header {
    background: #2c3e50;
    color: #fff;
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
  }

  .summary-label {
    font-weight: 600;
  }

  .summary-value {
    font-weight: 400;
  }

  .games-list {
    flex: 1 1 0;
    min-height: 0;
    padding: 1.5rem 2rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    background: #f8f9fa;
  }
  .game-box.selected {
    border: 2px solid #3498db;
    background: #eaf6fb;
    cursor: pointer;
  }

  .game-box {
    cursor: pointer;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
    padding: 1rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .game-box.disabled {
      pointer-events: none;
      opacity: 0.5;
      filter: grayscale(0.5);
    }

  .game-row {
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
  }

  .game-label {
    font-weight: 500;
    color: #2c3e50;
  }

  .game-value {
    color: #34495e;
  }
</style>
