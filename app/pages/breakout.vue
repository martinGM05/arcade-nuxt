<template>
  <div class="game-page">
    <BreakoutGame />
  </div>
</template>

<script setup lang="ts">
import BreakoutGame from '~/components/games/BreakoutGame.vue'

definePageMeta({ layout: 'game', ssr: false })
</script>

<style scoped>
.game-page { display: flex; justify-content: center; align-items: center; }
</style>
