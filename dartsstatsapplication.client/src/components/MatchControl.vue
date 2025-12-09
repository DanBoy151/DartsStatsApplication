<template>
  <div class="match-control">
    <button class="large-square-btn">
      MatchControl
    </button>
    <button class="back-btn" @click="$emit('back')">
      Back
    </button>
  </div>
</template>

<script setup lang="ts">
  // No additional logic required
</script>

<style scoped>
  .match-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .large-square-btn {
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
    border: none;
    border-radius: 16px;
    background: #e67e22;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transition: background 1s;
  }

    .large-square-btn:hover {
      background: #b85c13;
    }

  .back-btn {
    padding: 0.75rem 2rem;
    font-size: 1.2rem;
    border: none;
    border-radius: 8px;
    background: #888;
    color: #fff;
    cursor: pointer;
    transition: background 1s;
  }

    .back-btn:hover {
      background: #555;
    }
</style>
