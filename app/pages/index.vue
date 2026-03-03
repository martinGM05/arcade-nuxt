<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">ARCADE<br>ENCYCLOPEDIA</h1>
      <p class="hero-sub">Juegos clásicos + multijugador en tiempo real</p>
    </div>

    <div class="cards">
      <GameCard
        to="/snake"
        title="SNAKE"
        description="Guía tu serpiente, come manzanas y crece sin chocar."
        emoji="🐍"
        accent="#39ff14"
        badge="SINGLE PLAYER"
      />
      <GameCard
        to="/tetris"
        title="TETRIS"
        description="Encaja los tetrominós y elimina líneas."
        emoji="🧱"
        accent="#00e5ff"
        badge="SINGLE PLAYER"
      />
      <GameCard
        to="/breakout"
        title="BREAKOUT"
        description="Destruye todos los ladrillos con la pelota."
        emoji="🎯"
        accent="#ff2d78"
        badge="SINGLE PLAYER"
      />
      <GameCard
        to="/snake/multiplayer"
        title="SNAKE VS SNAKE"
        description="Tiempo real. Dos serpientes, una sola ganadora."
        emoji="⚔️"
        accent="#ffe600"
        badge="MULTIPLAYER"
      />
      <GameCard
        to="/clue"
        title="CLUE"
        description="Deduce al asesino, el arma y la sala. 3-6 jugadores."
        emoji="🔍"
        accent="#b000ff"
        badge="MULTIPLAYER"
      />
      <GameCard
        to="/hangman"
        title="AHORCADO"
        description="Solitario o multijugador. Adivina la frase antes de que se acaben los intentos."
        emoji="🪢"
        accent="#ff9f1c"
        badge="SINGLE + MULTI"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
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
