<template>
  <div class="button-group">
    <button class="large-square-btn play-match-btn" :disabled="!canPlayMatch" @click="onPlayMatch">
      <span class="btn-label">Play Match</span>
      <img src="./icons/dartboard.svg" alt="Dartboard" class="dartboard-img" />
      <div v-if="match?.opponent" class="next-match">
        Next Match: {{ match?.opponent }} {{ locationSuffix }}
      </div>
      <div v-else class="next-match next-match--empty">
        No match scheduled
      </div>
    </button>
    <button class="large-square-btn" @click="emit('view-statistics')">
      <span class="btn-label">View Statistics</span>
      <img src="./icons/statistics.svg" alt="Statistics" class="statistics-img" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useMatchDataStore } from "@/stores/matchDataStore"
  import type { Match } from '@/models/MatchModel'
  import { convertToMatchFromMatchDataState } from '@/models/MatchModel'
  import { startMatch } from '@/actions/MatchService'
  import { isTodayOrPastAEST } from '@/utils/dateFormat'

  const matchDataStore = useMatchDataStore()
  const match: Match | null = convertToMatchFromMatchDataState(matchDataStore.getMatchData())

  const locationSuffix = computed(() => {
    if (match?.location === 'Home') return '(H)'
    if (match?.location === 'Away') return '(A)'
    return ''
  })

  // A match scheduled for a future date (AEST) can't be played yet - Play
  // Match stays disabled until its date arrives.
  const canPlayMatch = computed(() => !!match && isTodayOrPastAEST(match.date))

  async function onPlayMatch() {
    if (!match || !canPlayMatch.value) return
    await startMatch(match.id)
    emit('play-match')
  }

  const emit = defineEmits<{
    (e: 'play-match'): void
    (e: 'view-statistics'): void
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

    .large-square-btn:disabled {
      opacity: 0.5;
      cursor: default;
      box-shadow: none;
    }

    .large-square-btn:disabled:hover {
      border-color: #2c3e50;
      box-shadow: none;
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

  .next-match--empty {
    color: #7f8c9a;
    font-style: italic;
  }
</style>
