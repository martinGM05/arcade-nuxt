<template>
  <div class="lobby" :style="{ '--c': game?.color }">
    <h2 class="lobby-title">{{ game?.name?.toUpperCase() ?? 'SNAKE VS SNAKE' }}</h2>
    <p class="lobby-sub">Multijugador en tiempo real — 2 jugadores</p>

    <div v-if="!auth.user.value" class="auth-notice">
      <p>Debes <NuxtLink to="/login">iniciar sesión</NuxtLink> para jugar en multijugador.</p>
    </div>

    <template v-else>
      <!-- Room list -->
      <div class="rooms-section">
        <div class="rooms-header">
          <h3 class="rooms-title">SALAS EN ESPERA</h3>
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
              <span class="room-players">{{ room.players.length }}/2 jugadores</span>
            </div>
            <button
              class="join-btn"
              :disabled="joining === room.id || room.players.length >= 2"
              @click="joinRoom(room.id)"
            >
              {{ joining === room.id ? 'UNIENDO...' : 'UNIRSE' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Create room -->
      <button class="create-btn" :disabled="creating" @click="createRoom">
        {{ creating ? 'CREANDO...' : '+ CREAR SALA' }}
      </button>

      <div v-if="error" class="error">{{ error }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface RoomPlayer { user: { username: string } }
interface Room { id: string; players: RoomPlayer[] }

const game = useGame('SNAKE_VS_SNAKE')
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
    const data = await $fetch<{ rooms: Room[] }>('/api/rooms?game=SNAKE_VS_SNAKE')
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
      body: { game: 'SNAKE_VS_SNAKE' },
    })
    await navigateTo(`/snake/room/${data.room.id}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Error al crear sala'
  } finally {
    creating.value = false
  }
}

async function joinRoom(roomId: string): Promise<void> {
  joining.value = roomId
  await navigateTo(`/snake/room/${roomId}`)
}

onMounted(fetchRooms)
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 500px;
  margin: 0 auto;
}

.lobby-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: var(--c);
  text-shadow: 0 0 15px color-mix(in srgb, var(--c) 40%, transparent);
  text-align: center;
}

.lobby-sub {
  font-family: var(--font-mono);
  color: var(--text-dim);
  text-align: center;
}

/* Rooms */
.rooms-section { display: flex; flex-direction: column; gap: 0.75rem; }

.rooms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rooms-title {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
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

.room-list { display: flex; flex-direction: column; gap: 0.5rem; }

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

.room-info { display: flex; flex-direction: column; gap: 0.2rem; }

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
  transition: background 0.2s, color 0.2s;
}

.join-btn:hover:not(:disabled) { background: var(--c); color: var(--bg); }
.join-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Create */
.create-btn {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid var(--c);
  color: var(--c);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.05em;
}

.create-btn:hover:not(:disabled) { background: var(--c); color: var(--bg); }
.create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.error { font-family: var(--font-mono); color: var(--neon-pink); text-align: center; }
.auth-notice { font-family: var(--font-mono); color: var(--text-dim); text-align: center; }
</style>
