<template>
  <div class="holding-screen">
    <div class="top-bar">
      <h2 class="heading">Please Select Game</h2>
      <button class="exit-btn" @click="exit">Exit</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  const emit = defineEmits(['exit'])
  function exit() {
    emit('exit')
  }
</script>

<style scoped>
  .holding-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding-top: 3rem;
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-left: 2rem;
    padding-right: 2rem; /* Indent Exit button from right */
  }

  .heading {
    font-size: 2rem;
    font-weight: bold;
    color: #2c3e50;
    margin: 0;
  }

  .exit-btn {
    background: #888;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
  }

    .exit-btn:hover {
      background: #555;
    }
</style>
