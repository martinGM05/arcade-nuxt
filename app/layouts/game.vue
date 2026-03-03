<template>
  <div class="game-layout">
    <header class="game-header">
      <NuxtLink :to="gameConfig.back" class="back-link">
        ‹ {{ gameConfig.backLabel }}
      </NuxtLink>

      <h1 class="game-title">{{ gameConfig.name }}</h1>

      <div class="header-right">
        <span v-if="auth.user.value" class="player-name">{{ auth.user.value.username }}</span>
      </div>
    </header>

    <main class="game-main">
      <slot />
    </main>

    <footer v-if="gameConfig.controls" class="game-footer">
      <span class="controls-label">CONTROLES</span>
      <span class="controls-text">{{ gameConfig.controls }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const auth = useAuth()

interface GameConfig {
  name: string
  controls: string
  back: string
  backLabel: string
}

const gameConfig = computed<GameConfig>(() => {
  const path = route.path

  if (path.startsWith('/snake/room/')) {
    return { name: 'SNAKE VS SNAKE', controls: '← → ↑ ↓  Mover', back: '/snake/multiplayer', backLabel: 'Multijugador' }
  }
  if (path.startsWith('/snake')) {
    return { name: 'SNAKE', controls: '← → ↑ ↓  Mover  ·  P  Pausar', back: '/', backLabel: 'Inicio' }
  }
  if (path.startsWith('/tetris')) {
    return { name: 'TETRIS', controls: '← →  Mover  ·  ↑  Rotar  ·  ↓  Bajar  ·  Space  Caída  ·  P  Pausar', back: '/', backLabel: 'Inicio' }
  }
  if (path.startsWith('/breakout')) {
    return { name: 'BREAKOUT', controls: '← →  Mover paleta  ·  Space  Lanzar  ·  P  Pausar', back: '/', backLabel: 'Inicio' }
  }
  return { name: 'JUEGO', controls: '', back: '/', backLabel: 'Inicio' }
})
</script>

<style scoped>
.game-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

/* ─── Header ─── */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.5rem;
  background: rgba(13, 13, 13, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 1rem;
}

.back-link {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  color: var(--text-dim);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border);
  transition: border-color 0.2s, color 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.back-link:hover {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}

.game-title {
  font-family: var(--font-pixel);
  font-size: 0.65rem;
  color: var(--neon-green);
  text-shadow: 0 0 12px #39ff1466;
  letter-spacing: 0.1em;
  text-align: center;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  min-width: 80px;
  justify-content: flex-end;
}

.player-name {
  font-family: var(--font-pixel);
  font-size: 0.42rem;
  color: var(--neon-yellow);
}

/* ─── Main ─── */
.game-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ─── Footer / controls ─── */
.game-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid var(--border);
  background: rgba(13, 13, 13, 0.8);
  flex-wrap: wrap;
}

.controls-label {
  font-family: var(--font-pixel);
  font-size: 0.38rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  flex-shrink: 0;
}

.controls-text {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-dim);
}
</style>
