<script setup lang="ts">
  import MenuBar from './components/MenuBar.vue'
  import MainContent from './components/MainContent.vue'
  import ErrorToast from './components/ErrorToast.vue'
</script>

<template>
  <div class="app-layout">
    <header>
      <MenuBar />
    </header>
    <main>
      <MainContent />
    </main>
    <ErrorToast />
  </div>
</template>

<style scoped>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100vw;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #fff;
    overflow: auto;
  }

  header {
    width: 100%;
    background: #2c3e50;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  main {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    background: #fff;
    overflow: auto;
  }
</style>
