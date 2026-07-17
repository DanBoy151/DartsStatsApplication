<template>
  <div class="center-content">
    <div class="new-player-form">
      <h2 class="form-heading">New Player</h2>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="name"
                 type="text"
                 class="field-input"
                 :class="{ 'field-input--error': fieldError }"
                 maxlength="100"
                 autocomplete="off"
                 :disabled="submitting"
                 data-testid="new-player-name-input" />
        </label>
        <p v-if="fieldError" class="field-error" role="alert" data-testid="new-player-error">
          {{ fieldError }}
        </p>
        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-player-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-player-submit">
            {{ submitting ? 'Adding…' : 'Add Player' }}
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-player-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { validatePlayerName } from '@/validation/playerValidation'
  import { createPlayer } from '@/actions/PlayerService'

  defineEmits<{
    (e: 'done'): void
  }>()

  const name = ref('')
  const fieldError = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  async function submit() {
    successMessage.value = null

    const error = validatePlayerName(name.value)
    fieldError.value = error
    if (error) return

    submitting.value = true
    try {
      const player = await createPlayer(name.value.trim())
      // On failure, apiClient already surfaced the reason via the global error
      // toast (see actions/apiClient.ts) - nothing extra to show here.
      if (player) {
        successMessage.value = `"${player.name}" added.`
        name.value = ''
      }
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .center-content {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    width: 100%;
  }

  .new-player-form {
    width: 400px;
    max-width: 90vw;
    padding: 2rem;
    padding-bottom: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10);
  }

  .form-heading {
    font-size: 1.4rem;
    font-weight: bold;
    margin: 0 0 1.5rem 0;
    color: #2c3e50;
    text-align: center;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field-label {
    font-weight: 600;
    color: #2c3e50;
  }

  .field-input {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #c3cbd4;
    border-radius: 8px;
  }

  .field-input:focus {
    outline: none;
    border-color: #3498db;
  }

  .field-input--error {
    border-color: #e74c3c;
  }

  .field-error {
    color: #e74c3c;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
  }

  .success-message {
    color: #1f8a4c;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .control-btn {
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    background: #2c3e50;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
  }

    .control-btn:hover:not(:disabled) {
      background: #506E8BFF;
    }

    .control-btn:disabled {
      opacity: 0.7;
      cursor: default;
    }

  .back-btn {
    background: #888;
    color: #fff;
  }

    .back-btn:hover {
      background: #555;
    }
</style>
