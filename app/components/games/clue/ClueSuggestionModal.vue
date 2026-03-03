<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2 class="modal-title">{{ isAccusation ? 'ACUSACIÓN FORMAL' : 'HACER SUGERENCIA' }}</h2>
      <p class="modal-sub">{{ isAccusation ? 'Elige sospechoso, arma Y sala' : `Sala actual: ${ROOM_LABELS[currentRoom]}` }}</p>

      <div class="section">
        <h3 class="section-label">SOSPECHOSO</h3>
        <div class="options">
          <button
            v-for="s in SUSPECTS"
            :key="s"
            class="opt suspect"
            :class="{ active: selectedSuspect === s }"
            @click="selectedSuspect = s"
          >{{ SUSPECT_LABELS[s] }}</button>
        </div>
      </div>

      <div class="section">
        <h3 class="section-label">ARMA</h3>
        <div class="options">
          <button
            v-for="w in WEAPONS"
            :key="w"
            class="opt weapon"
            :class="{ active: selectedWeapon === w }"
            @click="selectedWeapon = w"
          >{{ WEAPON_LABELS[w] }}</button>
        </div>
      </div>

      <div v-if="isAccusation" class="section">
        <h3 class="section-label">SALA</h3>
        <div class="options">
          <button
            v-for="r in ROOMS"
            :key="r"
            class="opt room"
            :class="{ active: selectedRoom === r }"
            @click="selectedRoom = r"
          >{{ ROOM_LABELS[r] }}</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('close')">CANCELAR</button>
        <button
          class="btn-confirm"
          :disabled="!canConfirm"
          @click="confirm"
        >{{ isAccusation ? 'ACUSAR' : 'SUGERIR' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SuspectId, WeaponId, RoomId } from '~/composables/useClueWs'

const props = defineProps<{
  currentRoom: RoomId
  isAccusation?: boolean
}>()

const emit = defineEmits<{
  (e: 'suggest', suspect: SuspectId, weapon: WeaponId): void
  (e: 'accuse', suspect: SuspectId, weapon: WeaponId, room: RoomId): void
  (e: 'close'): void
}>()

const SUSPECTS: SuspectId[] = ['scarlett','mustard','white','green','peacock','plum']
const WEAPONS: WeaponId[] = ['candlestick','knife','lead_pipe','revolver','rope','wrench']
const ROOMS: RoomId[] = ['study','library','billiard_room','kitchen','ballroom','conservatory','hall','lounge','dining_room']

const SUSPECT_LABELS: Record<SuspectId, string> = {
  scarlett: 'Sra. Escarlata', mustard: 'Col. Mostaza', white: 'Srta. Blanco',
  green: 'Rev. Verde', peacock: 'Sra. Pavo Real', plum: 'Prof. Ciruela',
}
const WEAPON_LABELS: Record<WeaponId, string> = {
  candlestick: 'Candelabro', knife: 'Cuchillo', lead_pipe: 'Tubería',
  revolver: 'Revólver', rope: 'Cuerda', wrench: 'Llave inglesa',
}
const ROOM_LABELS: Record<RoomId, string> = {
  study: 'Estudio', library: 'Biblioteca', billiard_room: 'Billar',
  kitchen: 'Cocina', ballroom: 'Salón', conservatory: 'Jardín de Invierno',
  hall: 'Vestíbulo', lounge: 'Sala de estar', dining_room: 'Comedor',
}

const selectedSuspect = ref<SuspectId | null>(null)
const selectedWeapon = ref<WeaponId | null>(null)
const selectedRoom = ref<RoomId | null>(null)

const canConfirm = computed(() => {
  if (!selectedSuspect.value || !selectedWeapon.value) return false
  if (props.isAccusation && !selectedRoom.value) return false
  return true
})

function confirm(): void {
  if (!selectedSuspect.value || !selectedWeapon.value) return
  if (props.isAccusation) {
    if (!selectedRoom.value) return
    emit('accuse', selectedSuspect.value, selectedWeapon.value, selectedRoom.value)
  } else {
    emit('suggest', selectedSuspect.value, selectedWeapon.value)
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--neon-pink);
  box-shadow: 0 0 40px #ff2d7822;
  padding: 2rem;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.modal-title {
  font-family: var(--font-pixel);
  font-size: 0.75rem;
  color: var(--neon-pink);
}

.modal-sub {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

.section { display: flex; flex-direction: column; gap: 0.5rem; }

.section-label {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.opt {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 3px;
  transition: border-color 0.15s, color 0.15s;
}

.opt.suspect.active, .opt.suspect:hover { border-color: #ff2d78; color: #ff2d78; }
.opt.weapon.active,  .opt.weapon:hover  { border-color: #ffe600; color: #ffe600; }
.opt.room.active,    .opt.room:hover    { border-color: #00e5ff; color: #00e5ff; }

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
}

.btn-confirm {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.5rem 1rem;
  background: var(--neon-pink);
  border: none;
  color: var(--bg);
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
