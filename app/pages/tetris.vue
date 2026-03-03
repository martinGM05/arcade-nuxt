<template>
  <div class="game-page">
    <TetrisGame />
  </div>
</template>

<script setup lang="ts">
import TetrisGame from '~/components/games/TetrisGame.vue'

definePageMeta({ layout: 'game', ssr: false })
</script>

<style scoped>
.game-page { display: flex; justify-content: center; align-items: center; }
</style>
