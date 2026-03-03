<template>
  <div class="leaderboard">
    <h1 class="page-title">RÉCORDS GLOBALES</h1>

    <div class="game-tabs">
      <button
        v-for="g in games"
        :key="g.key"
        class="tab"
        :class="{ active: selected === g.key }"
        :style="{ '--c': g.color }"
        @click="selected = g.key"
      >{{ g.label }}</button>
    </div>

    <div v-if="pending" class="loading">Cargando...</div>
    <div v-else-if="error" class="error">Error al cargar</div>
    <table v-else class="score-table">
      <thead>
        <tr>
          <th>#</th>
          <th>JUGADOR</th>
          <th>PUNTOS</th>
          <th>FECHA</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(s, i) in filtered" :key="s.id">
          <td class="rank">{{ i + 1 }}</td>
          <td class="player">{{ s.user.username }}</td>
          <td class="pts">{{ s.value }}</td>
          <td class="date">{{ formatDate(s.createdAt) }}</td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="4" class="empty">Sin récords aún</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface Score {
  id: string
  game: string
  value: number
  createdAt: string
  user: { username: string }
}

const games = [
  { key: 'SNAKE', label: 'SNAKE', color: '#39ff14' },
  { key: 'TETRIS', label: 'TETRIS', color: '#00e5ff' },
  { key: 'BREAKOUT', label: 'BREAKOUT', color: '#ff2d78' },
  { key: 'SNAKE_VS_SNAKE', label: 'SNAKE VS SNAKE', color: '#ffe600' },
]

const selected = ref('SNAKE')

const { data, pending, error } = useFetch<{ scores: Score[] }>('/api/scores')

const filtered = computed(() =>
  (data.value?.scores ?? []).filter(s => s.game === selected.value),
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
</script>

<style scoped>
.leaderboard {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: var(--neon-yellow);
  text-shadow: 0 0 15px #ffe60066;
  text-align: center;
}

.game-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid var(--c, var(--neon-cyan));
  color: var(--c, var(--neon-cyan));
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.05em;
}

.tab.active, .tab:hover {
  background: var(--c, var(--neon-cyan));
  color: var(--bg);
}

.score-table {
  width: 100%;
  border-collapse: collapse;
}

.score-table th {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.1em;
}

.score-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
}

.rank { font-family: var(--font-pixel); font-size: 0.5rem; color: var(--text-dim); }
.player { color: var(--text); }
.pts { font-family: var(--font-pixel); font-size: 0.6rem; color: var(--neon-yellow); }
.date { font-size: 0.8rem; color: var(--text-dim); }

.loading, .error, .empty {
  text-align: center;
  font-family: var(--font-mono);
  color: var(--text-dim);
  padding: 2rem;
}
</style>
