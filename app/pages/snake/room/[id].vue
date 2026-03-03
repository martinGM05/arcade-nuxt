<template>
  <div class="room-page">
    <SnakeVsSnakeCanvas :room-id="roomId" />
  </div>
</template>

<script setup lang="ts">
import SnakeVsSnakeCanvas from '~/components/games/snake-vs-snake/SnakeVsSnakeCanvas.vue'

definePageMeta({ layout: 'game', ssr: false, middleware: 'auth' })

const route = useRoute()
const roomId = route.params.id as string
</script>

<style scoped>
.room-page { display: flex; justify-content: center; align-items: center; }
</style>
