<template>
  <div class="layout">
    <nav class="nav">
      <NuxtLink to="/" class="nav-brand">ARCADE 🕹</NuxtLink>
      <div class="nav-links">
        <NuxtLink v-for="g in navGames" :key="g.key" :to="g.route">{{ g.name }}</NuxtLink>
        <NuxtLink to="/leaderboard">Récords</NuxtLink>
      </div>
      <div class="nav-auth">
        <template v-if="auth.user.value">
          <NuxtLink to="/profile" class="nav-username">{{ auth.user.value.username }}</NuxtLink>
          <button class="nav-btn" @click="auth.logout()">Salir</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="nav-btn">Entrar</NuxtLink>
          <NuxtLink to="/register" class="nav-btn nav-btn--accent">Registrarse</NuxtLink>
        </template>
      </div>
    </nav>

    <main class="main">
      <slot />
    </main>

    <footer class="footer">
      <span>ARCADE ENCYCLOPEDIA &copy; 2026</span>
    </footer>
  </div>

  <ClientOnly>
    <CursorGlow />
  </ClientOnly>
</template>

<script setup lang="ts">
const auth = useAuth()

const { data: gamesData } = await useFetch('/api/games', { query: { nav: 'true' } })
const navGames = computed(() => gamesData.value?.games ?? [])
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 2rem;
  background: rgba(13, 13, 13, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.nav-brand {
  font-family: var(--font-pixel);
  font-size: 0.75rem;
  color: var(--neon-green);
  text-shadow: 0 0 10px #39ff1488;
  text-decoration: none;
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  flex: 1;
}

.nav-links a {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-dim);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--neon-cyan);
}

.nav-auth {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-username {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--neon-yellow);
}

.nav-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: var(--neon-cyan);
  color: var(--bg);
}

.nav-btn--accent {
  border-color: var(--neon-pink);
  color: var(--neon-pink);
}

.nav-btn--accent:hover {
  background: var(--neon-pink);
  color: var(--bg);
}

.main {
  flex: 1;
  padding: 2rem;
}

.footer {
  padding: 1rem 2rem;
  text-align: center;
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
}
</style>
