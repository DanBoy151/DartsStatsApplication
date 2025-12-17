<template>
  <div class="game-summary-panel">
    <div class="summary-header">
      <div class="summary-row">
        <span class="summary-label">Opposition:</span>
        <span class="summary-value">{{ opposition }}</span>
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
           @click="!props.disabled && $emit('select-game', game.id)">
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
  import { ref, defineProps, computed, onMounted } from 'vue'

  interface Game {
    id: string
    players: string[]
    type: string
    status: string
    result: string
  }

  const games = ref<Game[]>([])
  const loading = ref(true)
  const error = ref('')

  // Replace with real data or props as needed
  const props = defineProps<{
    matchId: string
    nextMatchDate: string
    opposition: string
    selectedGameId?: string
    disabled?: boolean
  }>()

  const formattedDate = computed(() => {
    if (!props.nextMatchDate) return ''
    const date = new Date(props.nextMatchDate)
    if (isNaN(date.getTime())) return props.nextMatchDate // fallback if invalid
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  })

  // Computes the current score as "home - away"
  const currentScore = computed(() => {
    let home = 0
    let away = 0
    //for (const game of games) {
    //  if (game.status === 'Completed') {
    //    if (game.winner === 'home') home++
    //    else if (game.winner === 'away') away++
    //  }
    //}
    return `${home} - ${away}`
  })

  function displayPlayers(game: Game): string {
    if (game.players && game.players.length > 0) {
      return game.players.join('/')
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

  async function fetchGames() {
    loading.value = true
    error.value = ''
    try {
      const response = await fetch(`http://localhost:5001/api/Match/${props.matchId}/games`)
      if (!response.ok) throw new Error('Failed to fetch players')
      const data = await response.json()
      games.value = data.map((g: any) => ({
        id: g.id,
        players: g.data?.players || [],
        type: g.data?.type || 'Unknown',
        status: g.data?.status || 'Unknown',
        result: g.data?.result || 'N/A',
      })) || []
    } catch (err: any) {
      error.value = err.message || 'Error fetching players'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchGames()
  })

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
