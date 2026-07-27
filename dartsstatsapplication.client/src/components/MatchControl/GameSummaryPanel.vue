<template>
  <div class="game-summary-panel" :class="{ 'variant-drawer': props.variant === 'drawer' }">
    <div class="summary-header">
      <!-- 'drawer' mode already has its own close affordance (GameListDrawer's
           floating ✕ button), so this title row - which absorbs what the old
           standalone HoldingScreenControl used to show - only applies to the
           merged full-screen overview. -->
      <div v-if="props.variant !== 'drawer'" class="header-title-row">
        <h2 class="header-title">Select Game</h2>
        <button class="back-btn" @click="emit('back-to-players')">Back to Players</button>
      </div>
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
        <span class="pill" :class="matchStatusClass">{{ matchStatus }}</span>
      </div>
    </div>
    <div class="games-list">
      <section v-if="trebleGames.length" class="game-group-wrap">
        <h3 class="game-section-heading">Trebles</h3>
        <div class="game-group">
          <div v-for="game in trebleGames"
               :key="game.id"
               class="game-box"
               data-testid="game-box-treble"
               :class="{ selected: game.id === selectedGameId, disabled: props.disabled }"
               @click="handleSelectGame(game.id)">
            <span class="players">{{ displayPlayers(game) }}</span>
            <span class="badges">
              <span class="pill" :class="statusPillClass(game)">{{ game.status }}</span>
              <span v-if="game.status === 'Complete'" class="pill" :class="resultPillClass(game)">{{ displayResult(game) }}</span>
              <span v-if="game.forfeited" class="pill pill-forfeit">Forfeit</span>
            </span>
          </div>
        </div>
      </section>

      <section v-if="doubleGames.length" class="game-group-wrap">
        <h3 class="game-section-heading">Doubles</h3>
        <div class="game-group">
          <div v-for="game in doubleGames"
               :key="game.id"
               class="game-box"
               data-testid="game-box-double"
               :class="{ selected: game.id === selectedGameId, disabled: props.disabled }"
               @click="handleSelectGame(game.id)">
            <span class="players">{{ displayPlayers(game) }}</span>
            <span class="badges">
              <span class="pill" :class="statusPillClass(game)">{{ game.status }}</span>
              <span v-if="game.status === 'Complete'" class="pill" :class="resultPillClass(game)">{{ displayResult(game) }}</span>
              <span v-if="game.forfeited" class="pill pill-forfeit">Forfeit</span>
            </span>
          </div>
        </div>
      </section>

      <section v-if="singleGames.length" class="game-group-wrap">
        <h3 class="game-section-heading">Singles</h3>
        <div class="game-group">
          <div v-for="game in singleGames"
               :key="game.id"
               class="game-box"
               data-testid="game-box-single"
               :class="{ selected: game.id === selectedGameId, disabled: props.disabled }"
               @click="handleSelectGame(game.id)">
            <span class="players">{{ displayPlayers(game) }}</span>
            <span class="badges">
              <span class="pill" :class="statusPillClass(game)">{{ game.status }}</span>
              <span v-if="game.status === 'Complete'" class="pill" :class="resultPillClass(game)">{{ displayResult(game) }}</span>
              <span v-if="game.forfeited" class="pill pill-forfeit">Forfeit</span>
            </span>
          </div>
        </div>
      </section>
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
      case 'Winning': return 'pill-win'
      case 'Losing': return 'pill-loss'
      default: return 'pill-draw'
    }
  });

  function gameTypeMatches(game: Game, prefix: string): boolean {
    return game.type.toLowerCase().startsWith(prefix)
  }

  const trebleGames = computed(() => games.value.filter(g => gameTypeMatches(g, 'treble')))
  const doubleGames = computed(() => games.value.filter(g => gameTypeMatches(g, 'double')))
  const singleGames = computed(() => games.value.filter(g => gameTypeMatches(g, 'single')))

  function statusPillClass(game: Game): string {
    switch (game.status) {
      case 'Pending': return 'pill-pending'
      case 'Ready': return 'pill-ready'
      case 'InProgress': return 'pill-inprogress'
      case 'Complete': return 'pill-complete'
      default: return 'pill-pending'
    }
  }

  function resultPillClass(game: Game): string {
    return game.result === 'Win' ? 'pill-win' : 'pill-loss'
  }

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
    (e: 'back-to-players'): void
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
    box-sizing: border-box;
    overflow: hidden;
  }

  /* GameListDrawer.vue's own panel already provides the card shadow/edge -
     this just needs to fill it, not nest a second card inside. Unlike the
     full-screen overview (which sizes to its content and lets the page
     scroll), the drawer's aside has a fixed height, so this variant alone
     needs to fill it and scroll its own games-list internally. */
  .game-summary-panel.variant-drawer {
    max-width: none;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    height: 100%;
    max-height: 100%;
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

  .header-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }

  .header-title {
    margin: 0;
    font-size: 1.4rem;
  }

  .back-btn {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.24);
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: bold;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.22);
    }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
  }

  .summary-label {
    font-weight: 600;
  }

  .summary-value {
    font-weight: 400;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.7rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  .pill-pending {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  .pill-ready {
    background: rgba(52, 152, 219, 0.22);
    color: #eaf4fc;
  }

  .pill-inprogress {
    background: rgba(243, 156, 18, 0.24);
    color: #fff3de;
  }

  .pill-complete {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  .pill-win {
    background: rgba(46, 204, 113, 0.24);
    color: #eafff2;
  }

  .pill-loss {
    background: rgba(231, 76, 60, 0.24);
    color: #fdecea;
  }

  .pill-draw {
    background: rgba(243, 156, 18, 0.24);
    color: #fff3de;
  }

  .games-list {
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: #f8f9fa;
  }

  /* Only the drawer variant (fixed-height aside) needs its own internal
     scroll - the full-screen overview flows to content height instead and
     lets its page-level container scroll (see MatchControl.vue). */
  .variant-drawer .games-list {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
  }

  .game-section-heading {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7f8c9a;
    margin: 0 0 0.7rem;
  }

  .game-group {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
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
    padding: 0.9rem 1.1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border: 2px solid transparent;
  }

  .game-box.disabled {
      pointer-events: none;
      opacity: 0.5;
      filter: grayscale(0.5);
    }

  .game-box .players {
    font-weight: 600;
    color: #2c3e50;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-box .badges {
    display: flex;
    gap: 0.5rem;
    flex: none;
  }

  /* Inside a game-box (white background), the header's pill palette (built
     for the dark ink header) would be low-contrast - a tinted-light-bg/
     saturated-text pairing matches the app's established pill idiom instead
     (see Player Statistics' trend badges). */
  .games-list .pill-pending {
    background: #eef1f3;
    color: #7f8c9a;
  }

  .games-list .pill-ready {
    background: #eaf4fc;
    color: #3498db;
  }

  .games-list .pill-inprogress {
    background: #fff3de;
    color: #b8790a;
  }

  .games-list .pill-complete {
    background: #eef1f3;
    color: #7f8c9a;
  }

  .games-list .pill-win {
    background: #e6f6ec;
    color: #1f8a4c;
  }

  .games-list .pill-loss {
    background: #fdecea;
    color: #e74c3c;
  }

  .pill-forfeit {
    background: #fff3de;
    color: #b8790a;
  }
</style>
