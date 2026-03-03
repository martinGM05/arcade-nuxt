<template>
  <NuxtLink :to="to" class="game-card" :style="{ '--accent': accent }">
    <div class="card-glow"></div>
    <div class="card-inner">
      <p class="card-emoji">{{ emoji }}</p>
      <h2 class="card-title">{{ title }}</h2>
      <p class="card-desc">{{ description }}</p>
      <span class="card-badge">{{ badge }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string
  title: string
  description: string
  emoji: string
  accent: string
  badge: string
}>()
</script>

<style scoped>
.game-card {
  position: relative;
  display: block;
  background: var(--bg-card);
  border: 1px solid var(--accent, var(--neon-cyan));
  text-decoration: none;
  padding: 1.75rem;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 30px color-mix(in srgb, var(--accent, var(--neon-cyan)) 40%, transparent);
}

.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, color-mix(in srgb, var(--accent, var(--neon-cyan)) 10%, transparent), transparent 60%);
  pointer-events: none;
}

.card-inner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  z-index: 1;
}

.card-emoji {
  font-size: 2.5rem;
  line-height: 1;
}

.card-title {
  font-family: var(--font-pixel);
  font-size: 0.75rem;
  color: var(--accent, var(--neon-cyan));
  text-shadow: 0 0 10px var(--accent, var(--neon-cyan));
}

.card-desc {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.card-badge {
  display: inline-block;
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--accent, var(--neon-cyan));
  color: var(--accent, var(--neon-cyan));
  letter-spacing: 0.1em;
  align-self: flex-start;
}
</style>
