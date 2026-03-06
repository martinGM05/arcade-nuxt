<template>
  <div class="clue-room">
    <!-- Overlay: connecting -->
    <div v-if="status === 'connecting'" class="overlay-full">
      <p class="overlay-title">CONECTANDO...</p>
    </div>

    <!-- Waiting lobby -->
    <template v-else-if="status === 'waiting'">
      <div class="waiting-panel">
        <h1 class="room-title">CLUE — SALA DE ESPERA</h1>
        <p class="waiting-info">
          Jugadores conectados: <strong>{{ gameState?.players.length ?? 0 }}</strong> / 6
        </p>
        <p class="waiting-hint">Se necesitan al menos 3 jugadores para empezar.</p>
        <div class="player-list">
          <div v-for="p in gameState?.players ?? []" :key="p.userId" class="player-item">
            <span class="player-dot" :style="{ background: PLAYER_COLORS[p.slot % 6] }"></span>
            {{ p.username }}
            <span v-if="p.userId === myUserId" class="you-badge">(TÚ)</span>
          </div>
        </div>
        <button class="start-btn" :disabled="(gameState?.players.length ?? 0) < 3" @click="clue.startGame()">
          INICIAR PARTIDA
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="share-url">
          <span>Comparte esta URL:</span>
          <code>{{ shareUrl }}</code>
          <button class="copy-btn" @click="copyUrl">COPIAR</button>
        </div>
      </div>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <div class="overlay-full">
        <p class="overlay-title error-title">ERROR</p>
        <p class="overlay-hint">{{ error }}</p>
        <NuxtLink to="/clue" class="back-btn">VOLVER AL LOBBY</NuxtLink>
      </div>
    </template>

    <!-- Game over -->
    <template v-else-if="status === 'finished' && gameOver">
      <div class="overlay-full">
        <p class="overlay-title" :class="{ won: gameOver.winner === myUserId }">
          {{ gameOver.winner === myUserId ? '¡GANASTE!' : gameOver.winnerUsername ? `GANÓ ${gameOver.winnerUsername}` : 'NADIE GANÓ' }}
        </p>
        <div v-if="gameOver.solution" class="solution-box">
          <p class="solution-title">LA SOLUCIÓN ERA:</p>
          <p>🔴 {{ SUSPECT_LABELS[gameOver.solution.suspect] }}</p>
          <p>🔪 {{ WEAPON_LABELS[gameOver.solution.weapon] }}</p>
          <p>🚪 {{ ROOM_LABELS[gameOver.solution.room] }}</p>
        </div>
        <NuxtLink to="/clue" class="back-btn">NUEVA PARTIDA</NuxtLink>
      </div>
    </template>

    <!-- Active game -->
    <template v-else-if="status === 'playing' && gameState">
      <!-- Top: phase stepper + whose turn -->
      <div class="top-bar">
        <div class="phase-steps">
          <span class="step" :class="{ active: gameState.phase === 'MOVE', done: ['SUGGEST','DISPROVE','ACCUSE_OR_PASS'].includes(gameState.phase) }">
            1 · MOVER
          </span>
          <span class="step-arrow">›</span>
          <span class="step" :class="{ active: gameState.phase === 'SUGGEST', done: ['DISPROVE','ACCUSE_OR_PASS'].includes(gameState.phase) }">
            2 · SUGERIR
          </span>
          <span class="step-arrow">›</span>
          <span class="step" :class="{ active: gameState.phase === 'DISPROVE' }">
            3 · REFUTAR
          </span>
          <span class="step-arrow">›</span>
          <span class="step" :class="{ active: gameState.phase === 'ACCUSE_OR_PASS' }">
            4 · DECIDIR
          </span>
        </div>

        <div class="turn-badge" :class="{ myturn: isMyTurn }">
          <span class="turn-dot" :style="{ background: currentPlayerColor }"></span>
          <span v-if="isMyTurn" class="turn-text myturn-text">¡TU TURNO!</span>
          <span v-else class="turn-text">Turno de <strong>{{ currentPlayer?.username }}</strong></span>
        </div>
      </div>

      <div class="game-layout">
        <!-- Left: Board -->
        <div class="left-col">
          <ClueBoard
            :current-room="myCurrentRoom"
            :players="gameState.players"
            :my-user-id="myUserId"
            :phase="gameState.phase"
            :is-my-turn="isMyTurn"
            @move="clue.move($event)"
          />

          <!-- Event log -->
          <div class="event-log">
            <p class="log-title">REGISTRO</p>
            <div v-for="(evt, i) in eventLog.slice(-5)" :key="i" class="log-entry">{{ evt }}</div>
            <div v-if="eventLog.length === 0" class="log-empty">Sin eventos aún...</div>
          </div>
        </div>

        <!-- Right: Action panel + Hand -->
        <div class="right-col">
          <!-- ─── ACTION PANEL ─── -->
          <div class="action-panel">

            <!-- MY TURN: MOVE -->
            <template v-if="isMyTurn && gameState.phase === 'MOVE'">
              <p class="ap-title">MUÉVETE A UNA SALA</p>
              <p class="ap-hint">
                Estás en: <strong>{{ myCurrentRoom ? ROOM_LABELS[myCurrentRoom] : '—' }}</strong>
                · Elige una sala adyacente:
              </p>
              <div class="room-btns">
                <button
                  v-for="room in adjacentRooms"
                  :key="room"
                  class="room-btn"
                  @click="clue.move(room)"
                >→ {{ ROOM_LABELS[room] }}</button>
              </div>
              <p v-if="adjacentRooms.length === 0" class="ap-hint" style="color: var(--neon-pink)">
                Sin salas adyacentes disponibles.
              </p>
            </template>

            <!-- MY TURN: SUGGEST -->
            <template v-else-if="isMyTurn && gameState.phase === 'SUGGEST'">
              <p class="ap-title">HACER SUGERENCIA</p>
              <p class="ap-hint">Estás en: <strong>{{ myCurrentRoom ? ROOM_LABELS[myCurrentRoom] : '' }}</strong></p>

              <div class="selector-section">
                <p class="selector-label">🔴 SOSPECHOSO</p>
                <div class="selector-options">
                  <button
                    v-for="s in SUSPECTS"
                    :key="s"
                    class="sel-btn suspect"
                    :class="{ active: selectedSuspect === s }"
                    @click="selectedSuspect = s"
                  >{{ SUSPECT_LABELS[s] }}</button>
                </div>
              </div>

              <div class="selector-section">
                <p class="selector-label">🔪 ARMA</p>
                <div class="selector-options">
                  <button
                    v-for="w in WEAPONS"
                    :key="w"
                    class="sel-btn weapon"
                    :class="{ active: selectedWeapon === w }"
                    @click="selectedWeapon = w"
                  >{{ WEAPON_LABELS[w] }}</button>
                </div>
              </div>

              <div class="suggest-summary" v-if="selectedSuspect || selectedWeapon">
                <span v-if="selectedSuspect">{{ SUSPECT_LABELS[selectedSuspect] }}</span>
                <span v-if="selectedSuspect && selectedWeapon"> · </span>
                <span v-if="selectedWeapon">{{ WEAPON_LABELS[selectedWeapon] }}</span>
                <span v-if="myCurrentRoom"> · {{ ROOM_LABELS[myCurrentRoom] }}</span>
              </div>

              <div class="ap-actions">
                <button
                  class="ap-btn primary"
                  :disabled="!selectedSuspect || !selectedWeapon"
                  @click="sendSuggest"
                >ENVIAR SUGERENCIA</button>
                <button class="ap-btn neutral" @click="clue.passSuggest()">
                  PASAR SUGERENCIA
                </button>
              </div>
            </template>

            <!-- DISPROVE: waiting -->
            <template v-else-if="gameState.phase === 'DISPROVE' && !disproveRequest">
              <p class="ap-title">REFUTANDO...</p>
              <p class="ap-hint">
                Esperando que los demás jugadores intenten refutar la sugerencia.
              </p>
              <div v-if="gameState.pendingSuggestion" class="suggestion-display">
                <p>🔴 {{ SUSPECT_LABELS[gameState.pendingSuggestion.suspect] }}</p>
                <p>🔪 {{ WEAPON_LABELS[gameState.pendingSuggestion.weapon] }}</p>
                <p>🚪 {{ ROOM_LABELS[gameState.pendingSuggestion.room] }}</p>
              </div>
            </template>

            <!-- DISPROVE: I have cards to show -->
            <template v-else-if="disproveRequest">
              <p class="ap-title disprove-title">REFUTA LA SUGERENCIA</p>
              <p class="ap-hint">Elige una carta para mostrar en privado al que sugirió:</p>
              <ClueCardHand
                :cards="disproveRequest.matchingCards"
                :public-cards="[]"
                :selectable="true"
                :selected="disprovePick ? [disprovePick] : []"
                @select="disprovePick = $event"
              />
              <div class="ap-actions">
                <button
                  class="ap-btn primary"
                  :disabled="!disprovePick"
                  @click="confirmDisprove"
                >MOSTRAR CARTA</button>
              </div>
            </template>

            <!-- MY TURN: ACCUSE_OR_PASS -->
            <template v-else-if="isMyTurn && gameState.phase === 'ACCUSE_OR_PASS'">
              <p class="ap-title">¿QUÉ HACES?</p>
              <p class="ap-hint">Puedes acusar formalmente si estás seguro, o pasar turno.</p>
              <div class="ap-actions vertical">
                <button class="ap-btn accuse" @click="showAccuse = true">
                  🔍 ACUSAR FORMALMENTE
                </button>
                <button class="ap-btn neutral" @click="clue.endTurn()">
                  PASAR TURNO →
                </button>
              </div>
            </template>

            <!-- NOT my turn -->
            <template v-else-if="!isMyTurn">
              <p class="ap-title waiting-title">TURNO DE {{ currentPlayer?.username?.toUpperCase() }}</p>
              <p class="ap-hint">{{ PHASE_LABELS[gameState.phase] }}</p>
              <div v-if="gameState.phase === 'SUGGEST' && gameState.pendingSuggestion" class="suggestion-display">
                <p>🔴 {{ SUSPECT_LABELS[gameState.pendingSuggestion.suspect] }}</p>
                <p>🔪 {{ WEAPON_LABELS[gameState.pendingSuggestion.weapon] }}</p>
                <p>🚪 {{ ROOM_LABELS[gameState.pendingSuggestion.room] }}</p>
              </div>
            </template>
          </div>

          <!-- Card hand -->
          <ClueCardHand
            :cards="gameState.myHand"
            :public-cards="gameState.publicCards"
          />

          <!-- Detective sheet -->
          <ClueDetectiveSheet />
        </div>
      </div>

      <!-- Accusation modal -->
      <ClueSuggestionModal
        v-if="showAccuse && myCurrentRoom"
        :current-room="myCurrentRoom"
        :is-accusation="true"
        @accuse="onAccuse"
        @close="showAccuse = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SuspectId, WeaponId, RoomId, CardId } from '~/composables/useClueWs'
import ClueBoard from '~/components/games/clue/ClueBoard.vue'
import ClueCardHand from '~/components/games/clue/ClueCardHand.vue'
import ClueSuggestionModal from '~/components/games/clue/ClueSuggestionModal.vue'
import ClueDetectiveSheet from '~/components/games/clue/ClueDetectiveSheet.vue'

definePageMeta({ layout: 'default', ssr: false, middleware: 'auth' })

const route = useRoute()
const roomId = route.params.id as string

const clue = useClueWs(roomId)
const { gameState, myUserId, status, error, gameOver, disproveRequest, lastEvent } = clue

const PLAYER_COLORS = ['#39ff14','#00e5ff','#ff2d78','#ffe600','#b000ff','#ff8c00']

const SUSPECTS: SuspectId[] = ['scarlett','mustard','white','green','peacock','plum']
const WEAPONS: WeaponId[] = ['candlestick','knife','lead_pipe','revolver','rope','wrench']

const PHASE_LABELS: Record<string, string> = {
  MOVE: 'Eligiendo sala...', SUGGEST: 'Haciendo sugerencia...',
  DISPROVE: 'Esperando refutación...', ACCUSE_OR_PASS: 'Decidiendo acusación...', WAITING: 'Esperando...',
}
const SUSPECT_LABELS: Record<string, string> = {
  scarlett: 'Sra. Escarlata', mustard: 'Col. Mostaza', white: 'Srta. Blanco',
  green: 'Rev. Verde', peacock: 'Sra. Pavo Real', plum: 'Prof. Ciruela',
}
const WEAPON_LABELS: Record<string, string> = {
  candlestick: 'Candelabro', knife: 'Cuchillo', lead_pipe: 'Tubería',
  revolver: 'Revólver', rope: 'Cuerda', wrench: 'Llave inglesa',
}
const ROOM_LABELS: Record<string, string> = {
  study: 'Estudio', library: 'Biblioteca', billiard_room: 'Billar',
  kitchen: 'Cocina', ballroom: 'Salón', conservatory: 'Jardín de Invierno',
  hall: 'Vestíbulo', lounge: 'Sala de estar', dining_room: 'Comedor',
}
const ADJACENCY: Record<RoomId, RoomId[]> = {
  study:         ['library', 'kitchen'],
  library:       ['study', 'billiard_room', 'ballroom'],
  billiard_room: ['library', 'conservatory'],
  kitchen:       ['study', 'ballroom', 'hall'],
  ballroom:      ['kitchen', 'library', 'conservatory', 'lounge'],
  conservatory:  ['billiard_room', 'ballroom', 'dining_room'],
  hall:          ['kitchen', 'lounge'],
  lounge:        ['hall', 'ballroom', 'dining_room'],
  dining_room:   ['conservatory', 'lounge'],
}

const showAccuse = ref(false)
const disprovePick = ref<CardId | null>(null)
const selectedSuspect = ref<SuspectId | null>(null)
const selectedWeapon = ref<WeaponId | null>(null)
const eventLog = ref<string[]>([])

const isMyTurn = computed(() => gameState.value?.currentUserId === myUserId.value)
const currentPlayer = computed(() => gameState.value?.players.find(p => p.userId === gameState.value?.currentUserId))
const currentPlayerColor = computed(() => PLAYER_COLORS[currentPlayer.value?.slot ?? 0 % PLAYER_COLORS.length]!)
const myCurrentRoom = computed<RoomId | null>(() =>
  gameState.value?.players.find(p => p.userId === myUserId.value)?.currentRoom ?? null
)
const adjacentRooms = computed<RoomId[]>(() => {
  if (!myCurrentRoom.value) return []
  return ADJACENCY[myCurrentRoom.value] ?? []
})

const shareUrl = computed(() => import.meta.client ? `${location.origin}/clue/room/${roomId}` : '')

async function copyUrl(): Promise<void> {
  if (import.meta.client) await navigator.clipboard.writeText(shareUrl.value).catch(() => {})
}

// Reset suggestion selectors when phase changes away from SUGGEST
watch(() => gameState.value?.phase, (phase) => {
  if (phase !== 'SUGGEST') {
    selectedSuspect.value = null
    selectedWeapon.value = null
  }
})

watch(lastEvent, (evt) => {
  if (!evt) return
  const p = evt.payload as Record<string, string> | undefined
  const username = p?.['username'] ?? p?.['byUsername'] ?? ''
  const messages: Record<string, string> = {
    PLAYER_JOINED:      `${username} se unió`,
    PLAYER_MOVED:       `${username} → ${ROOM_LABELS[p?.['to'] ?? ''] ?? p?.['to']}`,
    SUGGESTION_MADE:    `${username} sugirió: ${SUSPECT_LABELS[p?.['suspect'] ?? ''] ?? ''} + ${WEAPON_LABELS[p?.['weapon'] ?? ''] ?? ''}`,
    CANNOT_DISPROVE:    `${username || 'Nadie'} no puede refutar`,
    DISPROVE_RESULT_PUBLIC: `${p?.['disproverUsername'] ?? ''} mostró una carta`,
    ACCUSATION_RESULT:  p?.['correct'] === 'true' ? `${username} acusó ✓` : `${username} acusó ✗`,
    PLAYER_DISCONNECTED: `⚠ ${username} se desconectó (60 s para reconectar)`,
    PLAYER_RECONNECTED:  `✓ ${username} reconectado`,
    PLAYER_ELIMINATED:   `✗ ${username} eliminado por inactividad`,
    AFK_SKIP:            `⏱ ${username} sin respuesta — turno saltado`,
  }
  const msg = messages[evt.type]
  if (msg) eventLog.value.push(msg)
})

function sendSuggest(): void {
  if (!selectedSuspect.value || !selectedWeapon.value) return
  clue.suggest(selectedSuspect.value, selectedWeapon.value)
}

function onAccuse(suspect: SuspectId, weapon: WeaponId, room: RoomId): void {
  clue.accuse(suspect, weapon, room)
  showAccuse.value = false
}

function confirmDisprove(): void {
  if (!disprovePick.value) return
  clue.disprove(disprovePick.value)
  disprovePick.value = null
}

onMounted(async () => { await clue.connect() })
onUnmounted(() => { clue.disconnect() })
</script>

<style scoped>
.clue-room { min-height: 100vh; }

/* ─── Overlays ─── */
.overlay-full {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 80vh; gap: 1.5rem;
}
.overlay-title { font-family: var(--font-pixel); font-size: 1rem; color: #b000ff; text-shadow: 0 0 15px #b000ff88; }
.overlay-title.won { color: var(--neon-yellow); text-shadow: 0 0 15px #ffe60088; }
.error-title { color: var(--neon-pink); }
.overlay-hint { font-family: var(--font-mono); color: var(--text-dim); }
.back-btn { font-family: var(--font-pixel); font-size: 0.45rem; padding: 0.6rem 1.25rem; border: 1px solid #b000ff; color: #b000ff; text-decoration: none; }

/* ─── Waiting ─── */
.waiting-panel { max-width: 500px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; }
.room-title { font-family: var(--font-pixel); font-size: 0.75rem; color: #b000ff; }
.waiting-info { font-family: var(--font-mono); color: var(--text); }
.waiting-info strong { color: #b000ff; }
.waiting-hint { font-family: var(--font-mono); color: var(--text-dim); font-size: 0.85rem; }
.player-list { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
.player-item { display: flex; align-items: center; gap: 0.5rem; font-family: var(--font-mono); font-size: 0.9rem; color: var(--text); }
.player-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.you-badge { font-family: var(--font-pixel); font-size: 0.4rem; color: #b000ff; }
.start-btn { font-family: var(--font-pixel); font-size: 0.55rem; padding: 0.75rem 1.5rem; background: #b000ff; color: var(--bg); border: none; cursor: pointer; }
.start-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.share-url { display: flex; align-items: center; gap: 0.5rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim); }
code { background: var(--bg-surface); padding: 0.2rem 0.5rem; font-size: 0.75rem; }
.copy-btn { font-family: var(--font-pixel); font-size: 0.4rem; padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--neon-cyan); color: var(--neon-cyan); cursor: pointer; }

/* ─── Top bar ─── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.phase-steps {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.step {
  font-family: var(--font-pixel);
  font-size: 0.38rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  padding: 0.2rem 0.5rem;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.step.active {
  color: #b000ff;
  border-color: #b000ff;
  background: #b000ff18;
}

.step.done {
  color: var(--neon-green);
}

.step-arrow { color: var(--text-dim); font-size: 0.75rem; }

.turn-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

.turn-badge.myturn {
  border-color: #b000ff;
  background: #b000ff18;
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 #b000ff33; }
  50% { box-shadow: 0 0 0 4px #b000ff22; }
}

.turn-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.turn-text { color: var(--text); }
.myturn-text { color: #b000ff; font-family: var(--font-pixel); font-size: 0.5rem; letter-spacing: 0.05em; }

/* ─── Game layout ─── */
.game-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  align-items: start;
  padding: 0 0.5rem 1rem;
}

.left-col { display: flex; flex-direction: column; gap: 1rem; }
.right-col { display: flex; flex-direction: column; gap: 1rem; }

/* ─── Action panel ─── */
.action-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 120px;
}

.ap-title {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: #b000ff;
  letter-spacing: 0.08em;
}

.ap-title.disprove-title { color: var(--neon-cyan); }
.ap-title.waiting-title { color: var(--text-dim); }

.ap-hint {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-dim);
}

.ap-hint strong { color: var(--text); }

/* Room move buttons */
.room-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.room-btn {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.4rem 0.7rem;
  background: transparent;
  border: 1px solid var(--neon-green);
  color: var(--neon-green);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.room-btn:hover { background: var(--neon-green); color: var(--bg); }

/* Inline suggest selectors */
.selector-section { display: flex; flex-direction: column; gap: 0.35rem; }

.selector-label {
  font-family: var(--font-pixel);
  font-size: 0.38rem;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}

.selector-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.sel-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 0.3rem 0.55rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 3px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.sel-btn.suspect:hover, .sel-btn.suspect.active { border-color: #ff2d78; color: #ff2d78; background: #ff2d7811; }
.sel-btn.weapon:hover,  .sel-btn.weapon.active  { border-color: #ffe600; color: #ffe600; background: #ffe60011; }

.suggest-summary {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--neon-cyan);
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--neon-cyan);
  background: #00e5ff0a;
}

/* Action buttons */
.ap-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ap-actions.vertical { flex-direction: column; }

.ap-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.55rem 0.9rem;
  background: transparent;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s;
}

.ap-btn.primary { border: 1px solid #b000ff; color: #b000ff; }
.ap-btn.primary:hover:not(:disabled) { background: #b000ff; color: var(--bg); }
.ap-btn.primary:disabled { opacity: 0.35; cursor: not-allowed; }

.ap-btn.accuse { border: 1px solid var(--neon-pink); color: var(--neon-pink); }
.ap-btn.accuse:hover { background: var(--neon-pink); color: var(--bg); }

.ap-btn.neutral { border: 1px solid var(--border); color: var(--text-dim); }
.ap-btn.neutral:hover { border-color: var(--text-dim); color: var(--text); }

/* Suggestion display (when watching others) */
.suggestion-display {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.6rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

/* Event log */
.event-log {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.log-title {
  font-family: var(--font-pixel);
  font-size: 0.38rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.log-entry { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim); }
.log-empty { font-family: var(--font-mono); font-size: 0.78rem; color: #444; }

/* Game over */
.solution-box {
  background: var(--bg-card); border: 1px solid var(--neon-yellow);
  padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;
  font-family: var(--font-mono); font-size: 1rem;
}
.solution-title { font-family: var(--font-pixel); font-size: 0.5rem; color: var(--neon-yellow); margin-bottom: 0.5rem; }
.error { font-family: var(--font-mono); color: var(--neon-pink); }

@media (max-width: 900px) {
  .game-layout { grid-template-columns: 1fr; }
  .top-bar { padding: 0.5rem; }
}
</style>
