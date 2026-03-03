<template>
  <div class="mp-page">
    <RoomLobby />
  </div>
</template>

<script setup lang="ts">
import RoomLobby from '~/components/games/snake-vs-snake/RoomLobby.vue'

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.mp-page { max-width: 800px; margin: 0 auto; }
</style>
