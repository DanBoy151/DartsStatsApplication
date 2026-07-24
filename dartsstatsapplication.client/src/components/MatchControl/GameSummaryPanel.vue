<template>
  <div class="game-summary-panel" :class="{ 'variant-drawer': props.variant === 'drawer' }">
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
      <div class="summary-row">
        <span class="summary-label">Status:</span>
        <span class="summary-value" :class="matchStatusClass">{{ matchStatus }}</span>
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
        <div class="game-row">
          <span class="game-label">Result:</span>
          <span class="game-value">{{ displayResult(game) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, defineProps, computed, onMounted, watch } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import { getMatchGames } from "@/actions/MatchService"
  import { formatDisplayDate } from '@/utils/dateFormat'
  import type { Game } from '@/models/GameModel'
  import { convertToGameListFromGameDataStateList } from '@/models/GameModel'

  const matchDataStore = useMatchDataStore()

  const games = ref<Game[]>([])

  // Replace with real data or props as needed
  const props = defineProps<{
    selectedGameId: string
    disabled?: boolean
    /** 'drawer' drops the standalone card's own centering/shadow - used
     *  inside GameListDrawer.vue, which already provides that chrome, so the
     *  panel sits flush rather than nesting one card inside another. */
    variant?: 'full' | 'drawer'
  }>()

  const formattedDate = computed(() => formatDisplayDate(matchDataStore.getMatchData()?.date))

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

  // Winning/Losing/Drawing is about gamesFor vs gamesAgainst directly - not
  // affected by the home/away display flip currentScore does above.
  const matchStatus = computed(() => {
    const match = matchDataStore.getMatchData();
    const gamesFor = match?.gamesFor ?? 0;
    const gamesAgainst = match?.gamesAgainst ?? 0;

    if (gamesFor > gamesAgainst) return 'Winning';
    if (gamesFor < gamesAgainst) return 'Losing';
    return 'Drawing';
  });

  const matchStatusClass = computed(() => {
    switch (matchStatus.value) {
      case 'Winning': return 'status-winning'
      case 'Losing': return 'status-losing'
      default: return 'status-drawing'
    }
  });

  function displayResult(game: Game): string {
    return game.status === 'Complete' && game.result ? game.result : 'N/A'
  }

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

  /* GameListDrawer.vue's own panel already provides the card shadow/edge -
     this just needs to fill it, not nest a second card inside. */
  .game-summary-panel.variant-drawer {
    max-width: none;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  /* Room for GameListDrawer.vue's floating close button in the header's
     top-right corner. */
  .game-summary-panel.variant-drawer .summary-header {
    padding-right: 3.2rem;
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

  .status-winning {
    color: #2ecc71;
    font-weight: 700;
  }

  .status-losing {
    color: #e74c3c;
    font-weight: 700;
  }

  .status-drawing {
    color: #f39c12;
    font-weight: 700;
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
