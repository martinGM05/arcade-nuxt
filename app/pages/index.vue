<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">ARCADE<br>ENCYCLOPEDIA</h1>
      <p class="hero-sub">Juegos clásicos + multijugador en tiempo real</p>
    </div>

    <div class="cards">
      <GameCard
        v-for="g in games"
        :key="g.key"
        :to="g.route"
        :title="g.name.toUpperCase()"
        :description="g.description"
        :emoji="g.emoji"
        :accent="g.color"
        :badge="g.badge"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data } = await useFetch('/api/games')
const games = computed(() => data.value?.games ?? [])
</script>

<style scoped>
.home {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.hero {
  text-align: center;
  padding: 3rem 0 1rem;
}

.hero-title {
  font-family: var(--font-pixel);
  font-size: clamp(1.5rem, 5vw, 3rem);
  color: var(--neon-green);
  text-shadow: 0 0 30px #39ff1466;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.hero-sub {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: var(--text-dim);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
</style>
