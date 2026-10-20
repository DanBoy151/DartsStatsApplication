<template>
  <ModalDialog dialog-class="late-night-dialog">
    <div class="late-night-question">{{ question }}</div>
    <div class="late-night-buttons">
      <button type="button" data-testid="late-night-normal" @click="$emit('choose', 'Normal')">Play normally</button>
      <button type="button" data-testid="late-night-bull" @click="$emit('choose', 'ThrowForBull')">Throw for bull</button>
      <button v-if="allowSingleLeg" type="button" data-testid="late-night-single-leg" @click="$emit('choose', 'SingleLeg')">1 leg only</button>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import ModalDialog from './ModalDialog.vue'

  export type LateNightChoice = 'Normal' | 'ThrowForBull' | 'SingleLeg'

  const props = defineProps<{
    /** True when choosing for a new game (adds "1 leg only"); false for a new leg of an existing game. */
    allowSingleLeg: boolean
  }>()

  defineEmits<{ choose: [choice: LateNightChoice] }>()

  const question = computed(() =>
    props.allowSingleLeg
      ? "It's late - how should this game be played?"
      : "It's late - play the next leg, or throw for bull to decide the game?"
  )
</script>

<style scoped>
  .late-night-question {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .late-night-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

    .late-night-buttons button {
      font-size: 1.2rem;
      padding: 0.5rem 1.5rem;
      border-radius: 8px;
      border: none;
      background: #2c3e50;
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }

      .late-night-buttons button:hover {
        background: #506E8BFF;
      }
</style>
