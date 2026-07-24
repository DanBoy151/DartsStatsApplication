<template>
  <div class="modal-overlay">
    <div class="modal-dialog" :class="dialogClass" :style="minWidth ? { minWidth } : undefined">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    /** The dialog's own component-specific class (e.g. "won-bull-dialog") - kept
     *  on the dialog element itself so existing e2e selectors targeting each
     *  popup by its own class (`.won-bull-dialog`, `.doubles-finish-dialog`,
     *  etc.) keep matching unchanged. */
    dialogClass: string
    /** Escape hatch for the one dialog (Player of the Match) whose <select>
     *  benefits from a floor width - everything else sizes to its content. */
    minWidth?: string
  }>()
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;
  }

  .modal-dialog {
    background: #fff;
    border-radius: 12px;
    padding: 2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.15);
    text-align: center;
    /* Content-hugging by default (these are short Q&A prompts, not forms) -
       max-width is the actual fix, capping it before it can overflow a
       narrow viewport rather than forcing every dialog to a fixed width. */
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-sizing: border-box;
  }

  @media (max-width: 600px) {
    .modal-dialog {
      padding: 1.5rem 1.25rem;
    }
  }
</style>
