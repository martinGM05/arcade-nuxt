<template>
  <div class="sheet">
    <h3 class="sheet-title">LIBRETA DEL DETECTIVE</h3>

    <div class="sheet-section">
      <h4 class="sheet-section-title">SOSPECHOSOS</h4>
      <div v-for="s in SUSPECTS" :key="s" class="entry">
        <button
          class="mark-btn"
          :class="{ marked: marks[s] === 'x', circled: marks[s] === 'o' }"
          @click="cycleMark(s)"
        >
          <span class="entry-icon">🔴</span>
          <span class="entry-name">{{ SUSPECT_LABELS[s] }}</span>
          <span class="mark-indicator">{{ markSymbol(s) }}</span>
        </button>
      </div>
    </div>

    <div class="sheet-section">
      <h4 class="sheet-section-title">ARMAS</h4>
      <div v-for="w in WEAPONS" :key="w" class="entry">
        <button class="mark-btn" :class="{ marked: marks[w] === 'x', circled: marks[w] === 'o' }" @click="cycleMark(w)">
          <span class="entry-icon">🔪</span>
          <span class="entry-name">{{ WEAPON_LABELS[w] }}</span>
          <span class="mark-indicator">{{ markSymbol(w) }}</span>
        </button>
      </div>
    </div>

    <div class="sheet-section">
      <h4 class="sheet-section-title">SALAS</h4>
      <div v-for="r in ROOMS" :key="r" class="entry">
        <button class="mark-btn" :class="{ marked: marks[r] === 'x', circled: marks[r] === 'o' }" @click="cycleMark(r)">
          <span class="entry-icon">🚪</span>
          <span class="entry-name">{{ ROOM_LABELS[r] }}</span>
          <span class="mark-indicator">{{ markSymbol(r) }}</span>
        </button>
      </div>
    </div>

    <p class="sheet-hint">Click: sin marcar → ✗ (visto) → ○ (sospechoso) → sin marcar</p>
  </div>
</template>

<script setup lang="ts">
import type { CardId } from '~/composables/useClueWs'

type MarkState = 'x' | 'o' | undefined

const SUSPECTS = ['scarlett','mustard','white','green','peacock','plum'] as const
const WEAPONS = ['candlestick','knife','lead_pipe','revolver','rope','wrench'] as const
const ROOMS = ['study','library','billiard_room','kitchen','ballroom','conservatory','hall','lounge','dining_room'] as const

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

const marks = ref<Record<CardId, MarkState>>({} as Record<CardId, MarkState>)

function cycleMark(card: CardId): void {
  const current = marks.value[card]
  if (!current) marks.value[card] = 'x'
  else if (current === 'x') marks.value[card] = 'o'
  else marks.value[card] = undefined
}

function markSymbol(card: CardId): string {
  const m = marks.value[card]
  if (m === 'x') return '✗'
  if (m === 'o') return '○'
  return ''
}
</script>

<style scoped>
.sheet {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.sheet-title {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--neon-yellow);
  letter-spacing: 0.1em;
}

.sheet-section { display: flex; flex-direction: column; gap: 0.3rem; }

.sheet-section-title {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.mark-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  width: 100%;
  text-align: left;
  transition: background 0.15s;
}

.mark-btn:hover { background: var(--bg-card); }
.mark-btn.marked { color: var(--text-dim); text-decoration: line-through; }
.mark-btn.circled { color: var(--neon-pink); border-color: var(--neon-pink); }

.entry-icon { font-size: 0.9rem; flex-shrink: 0; }
.entry-name { flex: 1; }

.mark-indicator {
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  min-width: 12px;
  text-align: center;
  color: var(--neon-yellow);
}

.mark-btn.marked .mark-indicator { color: var(--text-dim); }
.mark-btn.circled .mark-indicator { color: var(--neon-pink); }

.sheet-hint {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
}
</style>
