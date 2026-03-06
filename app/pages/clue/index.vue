<template>
  <div class="clue-lobby" :style="{ '--c': game?.color }">
    <div class="lobby-header">
      <h1 class="lobby-title">{{ game?.name?.toUpperCase() ?? 'CLUE' }}</h1>
      <p class="lobby-sub">Juego de deducción — 3 a 6 jugadores</p>
    </div>

    <div class="rules-box">
      <h2 class="rules-title">CÓMO JUGAR</h2>
      <ol class="rules-list">
        <li>Cada turno: <strong>muévete</strong> a una sala adyacente.</li>
        <li><strong>Sugiere</strong> un sospechoso y un arma (la sala es donde estás).</li>
        <li>Los demás jugadores, en orden, intentan <strong>refutar</strong> mostrando una carta.</li>
        <li>Cuando estés seguro, haz una <strong>acusación formal</strong>. Si aciertas, ganas.</li>
        <li>Si fallas la acusación quedas eliminado, pero el juego continúa.</li>
      </ol>
    </div>

    <div v-if="!auth.user.value" class="auth-notice">
      <p>Debes <NuxtLink to="/login">iniciar sesión</NuxtLink> para crear o unirte a una partida.</p>
    </div>

    <template v-else>
      <!-- Room list -->
      <div class="rooms-section">
        <div class="rooms-header">
          <h2 class="rooms-title">SALAS EN ESPERA</h2>
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

      <!-- Create room -->
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
definePageMeta({ layout: 'default' })

interface RoomPlayer { user: { username: string } }
interface Room { id: string; players: RoomPlayer[] }

const game = useGame('CLUE')
const auth = useAuth()
const loadingRooms = ref(false)
const creating = ref(false)
const joining = ref<string | null>(null)
const error = ref('')
const rooms = ref<Room[]>([])

async function fetchRooms(): Promise<void> {
  loadingRooms.value = true
  error.value = ''
  try {
    const data = await $fetch<{ rooms: Room[] }>('/api/rooms?game=CLUE')
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
      body: { game: 'CLUE' },
    })
    await navigateTo(`/clue/room/${data.room.id}`)
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
    await navigateTo(`/clue/room/${roomId}`)
  } finally {
    joining.value = null
  }
}

onMounted(fetchRooms)
</script>

<style scoped>
.clue-lobby {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.lobby-header { text-align: center; }

.lobby-title {
  font-family: var(--font-pixel);
  font-size: 1.5rem;
  color: var(--c);
  text-shadow: 0 0 20px color-mix(in srgb, var(--c) 53%, transparent);
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
  color: var(--c);
  letter-spacing: 0.1em;
}

.rules-list {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 2;
  padding-left: 1.5rem;
}

.rules-list strong { color: var(--text); }

/* Rooms section */
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

.rooms-title {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--c);
  letter-spacing: 0.1em;
}

.refresh-btn {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  padding: 0.25rem 0.6rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: border-color 0.2s, color 0.2s;
}

.refresh-btn:hover:not(:disabled) { border-color: var(--c); color: var(--c); }
.refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-rooms {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 0.9rem;
  text-align: center;
  padding: 1.5rem;
  border: 1px dashed var(--border);
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition: border-color 0.2s;
}

.room-item:hover { border-color: color-mix(in srgb, var(--c) 27%, transparent); }

.room-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.room-host {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--text);
}

.room-players {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.join-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid var(--c);
  color: var(--c);
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s;
}

.join-btn:hover:not(:disabled) { background: var(--c); color: var(--bg); }
.join-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Create section */
.create-section { display: flex; justify-content: center; }

.create-btn {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  padding: 0.75rem 2rem;
  background: transparent;
  border: 1px solid var(--c);
  color: var(--c);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.05em;
}

.create-btn:hover:not(:disabled) { background: var(--c); color: var(--bg); }
.create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-notice { font-family: var(--font-mono); color: var(--text-dim); text-align: center; }
.error { font-family: var(--font-mono); color: var(--neon-pink); text-align: center; }
</style>
