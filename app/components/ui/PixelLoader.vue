<template>
  <div class="loader" :style="{ color: colorVar }">
    <span class="dot" v-for="i in 3" :key="i" :style="{ animationDelay: `${(i - 1) * 0.2}s` }">█</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ color?: 'cyan' | 'green' | 'pink' | 'yellow' }>(), { color: 'cyan' })
const colorVar = computed(() => `var(--neon-${props.color})`)
</script>

<style scoped>
.loader { display: inline-flex; gap: 4px; font-family: monospace; font-size: 1.2rem; }
.dot { animation: pulse 0.6s step-end infinite; opacity: 0.2; }
@keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
</style>
