<template>
  <div class="remaining-score-panel">
    <div v-if="isSingles" class="leg-score-row">
      Leg Score: 0 - 0
    </div>
    <div class="remaining-score-row">
      {{ score }}
    </div>
    <div class="button-row">
      <button class="start-btn">Start</button>
      <button class="back-btn" @click="$emit('back')">Cancel</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineProps } from 'vue'

  const props = defineProps<{
    gameType: string
  }>()

  const isSingles = computed(() =>
    props.gameType?.toLowerCase() === 'singles' || props.gameType?.toLowerCase() === 'single'
  )

  const score = computed(() => {
    if (props.gameType?.toLowerCase() === 'trebles' || props.gameType?.toLowerCase() === 'treble') {
      return 701
    }
    if (props.gameType?.toLowerCase() === 'doubles' || props.gameType?.toLowerCase() === 'double') {
      return 601
    }
    if (isSingles.value) {
      return 501
    }
    return ''
  })
</script>

<style scoped>
  .remaining-score-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .leg-score-row {
    font-size: 2rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2rem;
    width: 100%;
  }

  .remaining-score-row {
    font-size: 8rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: auto;
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: auto;
  }

  .back-btn {
    background: #888;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .back-btn:hover {
      background: #555;
    }

  .start-btn {
    background: #2c3e50;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

    .start-btn:hover {
      background: #506E8BFF;
    }
</style>
