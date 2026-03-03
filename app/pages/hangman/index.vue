<template>
  <div class="hangman-lobby">
    <div class="lobby-header">
      <h1 class="lobby-title">AHORCADO</h1>
      <p class="lobby-sub">Solitario o multijugador en tiempo real</p>
    </div>

    <div class="rules-box">
      <h2 class="rules-title">CÓMO JUGAR</h2>
      <ol class="rules-list">
        <li>En multijugador, un jugador al azar escribe la frase.</li>
        <li>Los demás adivinan letras o la frase completa.</li>
        <li>Gana el primero que complete la frase.</li>
      </ol>
    </div>

    <!-- Solo mode -->
    <div class="solo-section">
      <div class="solo-header">
        <h2 class="section-title">SOLITARIO</h2>
        <button class="refresh-btn" @click="startSolo">↻ NUEVA FRASE</button>
      </div>

      <div class="solo-board">
        <p class="word-count">Palabras: <strong>{{ soloWordCount }}</strong></p>
        <p class="masked">{{ soloMasked }}</p>
        <p class="remaining">Intentos restantes: <strong>{{ soloRemaining }}</strong></p>
        <p v-if="soloStatus === 'won'" class="result won">¡Ganaste!</p>
        <p v-else-if="soloStatus === 'lost'" class="result lost">Perdiste. Frase: {{ soloPhrase }}</p>
      </div>

      <div class="solo-actions" v-if="soloStatus === 'playing'">
        <div class="input-row">
          <input v-model="soloLetter" maxlength="1" placeholder="Letra" class="text-input" />
          <button class="action-btn" @click="guessSoloLetter">PROBAR LETRA</button>
        </div>
        <div class="input-row">
          <input v-model="soloGuess" placeholder="Adivinar frase" class="text-input" />
          <button class="action-btn" @click="guessSoloPhrase">ADIVINAR</button>
        </div>
        <div class="guessed">
          Letras probadas: <span>{{ soloGuessed.join(', ') || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- Multiplayer -->
    <div v-if="!auth.user.value" class="auth-notice">
      <p>Debes <NuxtLink to="/login">iniciar sesión</NuxtLink> para crear o unirte a una sala.</p>
    </div>

    <template v-else>
      <div class="rooms-section">
        <div class="rooms-header">
          <h2 class="section-title">SALAS EN ESPERA</h2>
          <button class="refresh-btn" :disabled="loadingRooms" @click="fetchRooms">
            {{ loadingRooms ? '...' : '↻ ACTUALIZAR' }}
          </button>
        </div>

        <div v-if="rooms.length === 0 && !loadingRooms" class="empty-rooms">
          No hay salas disponibles. ¡Crea una!
        </div>

        <div v-else class="room-list">
          <div v-for="room in rooms" :key="room.id" class="room-item">
            <div class="room-info">
              <span class="room-host">{{ room.players[0]?.user.username ?? '?' }}</span>
              <span class="room-players">{{ room.players.length }}/6 jugadores</span>
            </div>
            <button
              class="join-btn"
              :disabled="joining === room.id || room.players.length >= 6"
              @click="joinRoom(room.id)"
            >
              {{ joining === room.id ? 'UNIENDO...' : 'UNIRSE' }}
            </button>
          </div>
        </div>
      </div>

      <div class="create-section">
        <button class="create-btn" :disabled="creating" @click="createRoom">
          {{ creating ? 'CREANDO...' : '+ CREAR SALA' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import soloPhrases from '~/assets/data/hangman-phrases.json'

definePageMeta({ layout: 'default' })

interface RoomPlayer { user: { username: string } }
interface Room { id: string; players: RoomPlayer[] }

type SoloStatus = 'playing' | 'won' | 'lost'

const auth = useAuth()
const loadingRooms = ref(false)
const creating = ref(false)
const joining = ref<string | null>(null)
const error = ref('')
const rooms = ref<Room[]>([])

const soloPhrase = ref('')
const soloMasked = ref('')
const soloRemaining = ref(6)
const soloGuessed = ref<string[]>([])
const soloStatus = ref<SoloStatus>('playing')
const soloLetter = ref('')
const soloGuess = ref('')
const soloWordCount = ref(0)

function normalizePhrase(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toUpperCase()
}

function isLetter(ch: string): boolean {
  return /[A-ZÁÉÍÓÚÜÑ]/.test(ch)
}

function maskPhrase(phrase: string): string {
  return phrase.split('').map(ch => (isLetter(ch) ? '_' : ch)).join('')
}

function startSolo(): void {
  const pick = soloPhrases[Math.floor(Math.random() * soloPhrases.length)] ?? 'juego desconocido'
  const phrase = normalizePhrase(pick)
  soloPhrase.value = phrase
  soloMasked.value = maskPhrase(phrase)
  soloRemaining.value = 6
  soloGuessed.value = []
  soloStatus.value = 'playing'
  soloLetter.value = ''
  soloGuess.value = ''
  soloWordCount.value = phrase.trim().split(/\s+/).length
}

function guessSoloLetter(): void {
  if (soloStatus.value !== 'playing') return
  const letter = soloLetter.value.trim().toUpperCase()
  soloLetter.value = ''
  if (letter.length !== 1 || !isLetter(letter)) return
  if (soloGuessed.value.includes(letter)) return
  soloGuessed.value.push(letter)

  if (soloPhrase.value.includes(letter)) {
    const chars = soloMasked.value.split('')
    for (let i = 0; i < soloPhrase.value.length; i++) {
      if (soloPhrase.value[i] === letter) chars[i] = letter
    }
    soloMasked.value = chars.join('')
  } else {
    soloRemaining.value = Math.max(0, soloRemaining.value - 1)
  }

  if (!soloMasked.value.includes('_')) {
    soloStatus.value = 'won'
  } else if (soloRemaining.value <= 0) {
    soloStatus.value = 'lost'
  }
}

function guessSoloPhrase(): void {
  if (soloStatus.value !== 'playing') return
  const guess = normalizePhrase(soloGuess.value)
  soloGuess.value = ''
  if (!guess) return
  if (guess === soloPhrase.value) {
    soloMasked.value = soloPhrase.value
    soloStatus.value = 'won'
    return
  }
  soloRemaining.value = Math.max(0, soloRemaining.value - 1)
  if (soloRemaining.value <= 0) soloStatus.value = 'lost'
}

async function fetchRooms(): Promise<void> {
  loadingRooms.value = true
  error.value = ''
  try {
    const data = await $fetch<{ rooms: Room[] }>('/api/rooms?game=HANGMAN')
    rooms.value = data.rooms
  } catch {
    error.value = 'Error al cargar salas'
  } finally {
    loadingRooms.value = false
  }
}

async function createRoom(): Promise<void> {
  creating.value = true
  error.value = ''
  try {
    const data = await $fetch<{ room: { id: string } }>('/api/rooms', {
      method: 'POST',
      body: { game: 'HANGMAN' },
    })
    await navigateTo(`/hangman/room/${data.room.id}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Error al crear partida'
  } finally {
    creating.value = false
  }
}

async function joinRoom(roomId: string): Promise<void> {
  joining.value = roomId
  error.value = ''
  try {
    await navigateTo(`/hangman/room/${roomId}`)
  } finally {
    joining.value = null
  }
}

onMounted(() => {
  startSolo()
  if (auth.user.value) fetchRooms()
})
</script>

<style scoped>
.hangman-lobby {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.lobby-header { text-align: center; }

.lobby-title {
  font-family: var(--font-pixel);
  font-size: 1.6rem;
  color: #ff9f1c;
  text-shadow: 0 0 20px #ff9f1c66;
}

.lobby-sub {
  font-family: var(--font-mono);
  color: var(--text-dim);
  margin-top: 0.5rem;
}

.rules-box {
  background: var(--bg-card);
  border: 1px solid #2a2a2a;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rules-title {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  color: #ff9f1c;
  letter-spacing: 0.1em;
}

.rules-list {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 2;
  padding-left: 1.5rem;
}

.solo-section {
  background: var(--bg-card);
  border: 1px solid #2a2a2a;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.solo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  color: #ff9f1c;
  letter-spacing: 0.1em;
}

.solo-board {
  font-family: var(--font-mono);
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.masked {
  font-family: var(--font-pixel);
  font-size: 1rem;
  letter-spacing: 0.2rem;
  color: var(--text);
}

.result {
  font-weight: 700;
}

.result.won { color: var(--neon-green); }
.result.lost { color: var(--neon-pink); }

.solo-actions {
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

.action-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.4rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
}

.guessed { font-family: var(--font-mono); color: var(--text-dim); }

.rooms-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rooms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid #2a2a2a;
  padding: 0.75rem;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.room-host {
  font-family: var(--font-mono);
  color: var(--text);
}

.room-players {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

.join-btn,
.create-btn,
.refresh-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.4rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
}

.join-btn:disabled,
.create-btn:disabled,
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-section { display: flex; justify-content: center; }

.auth-notice {
  font-family: var(--font-mono);
  color: var(--text-dim);
  text-align: center;
}

.error {
  font-family: var(--font-mono);
  color: var(--neon-pink);
  text-align: center;
}
</style>
