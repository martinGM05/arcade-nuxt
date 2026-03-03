<template>
  <span class="badge" :class="`badge--${color}`"><slot /></span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ color?: 'cyan' | 'green' | 'pink' | 'yellow' }>(), { color: 'cyan' })
</script>

<style scoped>
.badge {
  display: inline-block;
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  padding: 0.2rem 0.5rem;
  letter-spacing: 0.1em;
  border-width: 1px;
  border-style: solid;
}
.badge--cyan   { border-color: var(--neon-cyan);   color: var(--neon-cyan); }
.badge--green  { border-color: var(--neon-green);  color: var(--neon-green); }
.badge--pink   { border-color: var(--neon-pink);   color: var(--neon-pink); }
.badge--yellow { border-color: var(--neon-yellow); color: var(--neon-yellow); }
</style>
