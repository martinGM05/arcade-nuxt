<template>
  <div class="hangman-room">
    <div v-if="state.status === 'connecting'" class="overlay-full">
      <p class="overlay-title">CONECTANDO...</p>
    </div>

    <template v-else-if="state.status === 'waiting'">
      <div class="panel">
        <h1 class="room-title">AHORCADO — SALA DE ESPERA</h1>
        <p class="waiting-info">Jugadores conectados: <strong>{{ state.players.length }}</strong> / 6</p>
        <p class="waiting-hint">Se necesitan al menos 2 jugadores.</p>
        <div class="player-list">
          <div v-for="p in state.players" :key="p.userId" class="player-item">
            <span class="player-dot"></span>
            {{ p.username }}
            <span v-if="p.userId === myUserId" class="you-badge">(TÚ)</span>
          </div>
        </div>
        <div class="share-url">
          <span>Comparte esta URL:</span>
          <code>{{ shareUrl }}</code>
          <button class="copy-btn" @click="copyUrl">COPIAR</button>
        </div>
      </div>
    </template>

    <template v-else-if="state.status === 'choosing'">
      <div class="panel">
        <h1 class="room-title">AHORCADO — ELIGE FRASE</h1>
        <p class="waiting-info">Jugadores: <strong>{{ state.players.length }}</strong> / 6</p>
        <div class="player-list">
          <div v-for="p in state.players" :key="p.userId" class="player-item">
            <span class="player-dot" :class="{ setter: p.isSetter }"></span>
            {{ p.username }}
            <span v-if="p.userId === myUserId" class="you-badge">(TÚ)</span>
            <span v-if="p.isSetter" class="setter-badge">(ESCRIBE LA FRASE)</span>
          </div>
        </div>

        <div v-if="isSetter" class="setter-box">
          <p class="setter-title">Escribe una frase corta (3-60 caracteres)</p>
          <div class="input-row">
            <input v-model="phraseInput" class="text-input" placeholder="Ej: noche de lluvia intensa" />
            <button class="action-btn" @click="sendPhrase">ENVIAR</button>
          </div>
        </div>

        <p v-else class="waiting-hint">Esperando la frase del jugador seleccionado...</p>
      </div>
    </template>

    <template v-else-if="state.status === 'playing'">
      <div class="game-panel">
        <div class="top-bar">
          <p class="word-count">Palabras: <strong>{{ state.wordCount }}</strong></p>
          <p class="remaining">Intentos: <strong>{{ state.remaining }}</strong> / {{ state.maxErrors }}</p>
        </div>

        <p class="masked">{{ state.masked }}</p>

        <div class="guessed">Letras: {{ state.guessedLetters.join(', ') || '—' }}</div>

        <div v-if="!isSetter" class="actions">
          <div class="input-row">
            <input v-model="letterInput" maxlength="1" class="text-input" placeholder="Letra" />
            <button class="action-btn" @click="sendLetter">PROBAR LETRA</button>
          </div>
          <div class="input-row">
            <input v-model="guessInput" class="text-input" placeholder="Adivinar frase" />
            <button class="action-btn" @click="sendGuess">ADIVINAR</button>
          </div>
        </div>

        <p v-else class="setter-hint">Tú escribiste la frase. Observa cómo juegan.</p>
      </div>
    </template>

    <template v-else-if="state.status === 'finished'">
      <div class="panel">
        <p class="overlay-title" :class="{ won: state.winnerId === myUserId }">
          {{ state.winnerId ? (state.winnerId === myUserId ? '¡GANASTE!' : `GANÓ ${state.winnerUsername}`) : 'NADIE GANÓ' }}
        </p>
        <p class="final-phrase">Frase: <strong>{{ state.phrase }}</strong></p>
        <NuxtLink to="/hangman" class="back-btn">NUEVA PARTIDA</NuxtLink>
      </div>
    </template>

    <template v-else-if="state.status === 'error'">
      <div class="overlay-full">
        <p class="overlay-title error-title">ERROR</p>
        <p class="overlay-hint">{{ error || 'Error inesperado' }}</p>
        <NuxtLink to="/hangman" class="back-btn">VOLVER</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useHangmanWs } from '~/composables/useHangmanWs'

definePageMeta({ layout: 'default', ssr: false, middleware: 'auth' })

const route = useRoute()
const roomId = route.params.id as string
const { state, error, myUserId, connect, setPhrase, guessLetter, guessPhrase } = useHangmanWs(roomId)

const phraseInput = ref('')
const letterInput = ref('')
const guessInput = ref('')

const isSetter = computed(() => state.value.setterUserId === myUserId.value)
const shareUrl = computed(() => `${location.origin}/hangman/room/${roomId}`)

function sendPhrase(): void {
  if (!phraseInput.value.trim()) return
  setPhrase(phraseInput.value)
  phraseInput.value = ''
}

function sendLetter(): void {
  if (!letterInput.value.trim()) return
  guessLetter(letterInput.value)
  letterInput.value = ''
}

function sendGuess(): void {
  if (!guessInput.value.trim()) return
  guessPhrase(guessInput.value)
  guessInput.value = ''
}

async function copyUrl(): Promise<void> {
  await navigator.clipboard.writeText(shareUrl.value)
}

onMounted(connect)
</script>

<style scoped>
.hangman-room {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.panel,
.game-panel {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid #2a2a2a;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.room-title {
  font-family: var(--font-pixel);
  font-size: 0.9rem;
  color: #ff9f1c;
  letter-spacing: 0.1em;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.player-item { display: flex; align-items: center; gap: 0.5rem; }

.player-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #ff9f1c;
}

.player-dot.setter { background: var(--neon-green); }

.you-badge { color: var(--text); margin-left: 0.25rem; }

.setter-badge { color: var(--neon-green); margin-left: 0.25rem; }

.waiting-info,
.waiting-hint {
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.setter-box {
  background: #0b0b0b;
  border: 1px solid var(--border);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setter-title {
  font-family: var(--font-mono);
  color: var(--text);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.masked {
  font-family: var(--font-pixel);
  font-size: 1.1rem;
  letter-spacing: 0.2rem;
  color: var(--text);
}

.guessed {
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.text-input {
  flex: 1;
  background: #0b0b0b;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 0.6rem;
  font-family: var(--font-mono);
}

.action-btn,
.copy-btn,
.back-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.4rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
}

.setter-hint {
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.share-url {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.overlay-full {
  width: 100%;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.overlay-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: #ff9f1c;
}

.overlay-title.won { color: var(--neon-green); }

.error-title { color: var(--neon-pink); }

.overlay-hint {
  font-family: var(--font-mono);
  color: var(--text-dim);
}

.final-phrase {
  font-family: var(--font-mono);
  color: var(--text-dim);
}
</style>
