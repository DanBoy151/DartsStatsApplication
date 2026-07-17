<template>
  <div class="center-content">
    <div class="new-match-form">
      <h2 class="form-heading">New Match</h2>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span class="field-label">Opponent</span>
          <input v-model="opponent"
                 type="text"
                 class="field-input"
                 :class="{ 'field-input--error': errors.opponent }"
                 maxlength="200"
                 autocomplete="off"
                 :disabled="submitting"
                 data-testid="new-match-opponent-input" />
          <span v-if="errors.opponent" class="field-error" role="alert" data-testid="new-match-opponent-error">
            {{ errors.opponent }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">Date</span>
          <input v-model="date"
                 type="date"
                 class="field-input"
                 :class="{ 'field-input--error': errors.date }"
                 :disabled="submitting"
                 data-testid="new-match-date-input" />
          <span v-if="errors.date" class="field-error" role="alert" data-testid="new-match-date-error">
            {{ errors.date }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">Location</span>
          <select v-model="location"
                  class="field-input"
                  :class="{ 'field-input--error': errors.location }"
                  :disabled="submitting"
                  data-testid="new-match-location-input">
            <option value="Home">Home</option>
            <option value="Away">Away</option>
          </select>
          <span v-if="errors.location" class="field-error" role="alert" data-testid="new-match-location-error">
            {{ errors.location }}
          </span>
        </label>

        <p v-if="successMessage" class="success-message" role="status" aria-live="polite" data-testid="new-match-success">
          {{ successMessage }}
        </p>

        <div class="button-row">
          <button type="submit" class="control-btn" :disabled="submitting" data-testid="new-match-submit">
            {{ submitting ? 'Adding…' : 'Add Match' }}
          </button>
          <button type="button" class="control-btn back-btn" @click="$emit('done')" data-testid="new-match-done">
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { validateNewMatch, hasErrors, type NewMatchErrors } from '@/validation/matchValidation'
  import { createMatch } from '@/actions/MatchService'

  defineEmits<{
    (e: 'done'): void
  }>()

  const opponent = ref('')
  const date = ref('')
  const location = ref<'Home' | 'Away'>('Home')
  const errors = ref<NewMatchErrors>({})
  const successMessage = ref<string | null>(null)
  const submitting = ref(false)

  async function submit() {
    successMessage.value = null

    const validationErrors = validateNewMatch({ opponent: opponent.value, date: date.value, location: location.value })
    errors.value = validationErrors
    if (hasErrors(validationErrors)) return

    submitting.value = true
    try {
      const match = await createMatch({
        opponent: opponent.value.trim(),
        date: date.value,
        location: location.value,
      })
      // On failure, apiClient already surfaced the reason via the global error
      // toast (see actions/apiClient.ts) - nothing extra to show here. On
      // success, stay put and clear the form rather than navigating away
      // immediately - a captain entering a season's fixture list wants to
      // add several matches in a row, and navigating away here would also
      // yank the success message off screen before it could be read.
      if (match) {
        successMessage.value = `Match vs "${match.opponent}" scheduled.`
        opponent.value = ''
        date.value = ''
        location.value = 'Home'
        errors.value = {}
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

  .new-match-form {
    width: 420px;
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
    margin-bottom: 1.25rem;
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
    background: #fff;
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
    margin-top: 1.5rem;
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
