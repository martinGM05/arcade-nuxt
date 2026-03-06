<template>
  <div class="leaderboard">
    <div class="page-header">
      <h1 class="page-title">RÉCORDS GLOBALES</h1>
      <button class="refresh-btn" :disabled="pending" @click="refresh()">
        {{ pending ? '...' : '↺' }}
      </button>
    </div>

    <div class="game-tabs">
      <button
        v-for="g in games"
        :key="g.key"
        class="tab"
        :class="{ active: selected === g.key }"
        :style="{ '--c': g.color }"
        @click="selected = g.key"
      >{{ g.name }}</button>
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
        <tr v-for="(s, i) in data?.scores ?? []" :key="s.id">
          <td class="rank">{{ i + 1 }}</td>
          <td class="player">{{ s.user.username }}</td>
          <td class="pts">{{ s.value }}</td>
          <td class="date">{{ formatDate(s.createdAt) }}</td>
        </tr>
        <tr v-if="!data?.scores?.length">
          <td colspan="4" class="empty">Sin récords aún</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const CACHE_TTL = 30_000 // 30 segundos

interface Game {
  key: string
  name: string
  color: string
}

interface Score {
  id: string
  value: number
  createdAt: string
  user: { username: string }
}

const { data: gamesData } = await useFetch<{ games: Game[] }>('/api/games')
const games = computed(() => gamesData.value?.games ?? [])

const selected = ref('')
watch(games, (list) => { if (list.length && !selected.value) selected.value = list[0].key }, { immediate: true })

const { data, pending, error, refresh } = useFetch<{ scores: Score[], fetchedAt: number }>(
  '/api/scores',
  {
    query: { game: selected },
    // Usa caché si el dato tiene menos de 30s; re-fetcha al cambiar tab si expiró
    getCachedData(key, nuxtApp) {
      const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      if (!cached?.fetchedAt) return undefined
      if (Date.now() - cached.fetchedAt > CACHE_TTL) return undefined
      return cached
    },
  },
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

.page-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: var(--neon-yellow);
  text-shadow: 0 0 15px #ffe60066;
}

.refresh-btn {
  font-family: var(--font-pixel);
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid var(--neon-yellow);
  color: var(--neon-yellow);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  line-height: 1;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--neon-yellow);
  color: var(--bg);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: default;
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
