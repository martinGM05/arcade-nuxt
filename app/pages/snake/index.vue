<template>
  <div class="game-page">
    <SnakeGame />
  </div>
</template>

<script setup lang="ts">
import SnakeGame from '~/components/games/SnakeGame.vue'

definePageMeta({ layout: 'game', ssr: false })
</script>

<style scoped>
.game-page { display: flex; justify-content: center; align-items: center; }
</style>
